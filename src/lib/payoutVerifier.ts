import { createPublicClient, http, decodeEventLog, parseAbiItem } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export interface PayoutVerificationResult {
  isValid: boolean;
  blockNumber?: bigint;
  sender?: string;
  recipient?: string;
  transferredAmountUsdt?: number;
  error?: string;
}

const TRANSFER_EVENT_ABI = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

/**
 * Verifies an on-chain BSC USDT payout transaction
 * Ensures:
 * 1. Transaction exists and was successfully confirmed on-chain
 * 2. Contract called was the official USDT token contract
 * 3. ERC20 Transfer event sent USDT to the expected winner wallet
 * 4. Transferred amount matches the expected reward amount in USDT (accounting for 18 decimals)
 */
export async function verifyUsdtPayoutTransaction(
  txHash: string,
  expectedWinnerWallet: string,
  expectedAmountUsdt: number,
  chainId: number = 97
): Promise<PayoutVerificationResult> {
  try {
    const chainConfig =
      chainId === 56 ? bsc : chainId === 97 ? bscTestnet : bscTestnet;
    const rpcUrl =
      chainId === 56
        ? CONTRACT_ADDRESSES[56].rpcUrl
        : CONTRACT_ADDRESSES[97].rpcUrl;
    const expectedUsdtAddress = (
      chainId === 56
        ? CONTRACT_ADDRESSES[56].usdt
        : CONTRACT_ADDRESSES[97].usdt
    ).toLowerCase();

    const client = createPublicClient({
      chain: chainConfig,
      transport: http(rpcUrl),
    });

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return { isValid: false, error: "Transaction receipt not found on BNB Chain." };
    }

    if (receipt.status !== "success") {
      return { isValid: false, error: "Transaction reverted on BNB Smart Chain." };
    }

    // Inspect logs for USDT Transfer event
    const normalizedExpectedRecipient = expectedWinnerWallet.toLowerCase();
    let verifiedTransferFound = false;
    let actualTransferredAmountUsdt = 0;
    let actualSender = "";
    let actualRecipient = "";

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === expectedUsdtAddress) {
        try {
          const rawLog = log as any;
          const decoded: any = decodeEventLog({
            abi: [TRANSFER_EVENT_ABI],
            data: rawLog.data,
            topics: rawLog.topics,
          });

          if (decoded.eventName === "Transfer") {
            const from = (decoded.args?.from || "").toLowerCase();
            const to = (decoded.args?.to || "").toLowerCase();
            const value = decoded.args?.value ? BigInt(decoded.args.value) : 0n;

            // 18 decimals for BSC-USD / BSC Testnet USDT
            const transferredUsdt = Number(value) / 1e18;

            if (to === normalizedExpectedRecipient) {
              actualSender = from;
              actualRecipient = to;
              actualTransferredAmountUsdt = transferredUsdt;

              // Check amount tolerance (must be within 0.0001 USDT of expected reward)
              if (Math.abs(transferredUsdt - expectedAmountUsdt) < 0.0001) {
                verifiedTransferFound = true;
                break;
              }
            }
          }
        } catch {
          // Log was not a Transfer event on this contract
          continue;
        }
      }
    }

    if (!verifiedTransferFound) {
      return {
        isValid: false,
        error: `No matching Transfer event found on USDT contract (${expectedUsdtAddress}) to winner ${expectedWinnerWallet} for ${expectedAmountUsdt} USDT. Found recipient: ${actualRecipient}, amount: ${actualTransferredAmountUsdt} USDT.`,
      };
    }

    return {
      isValid: true,
      blockNumber: receipt.blockNumber,
      sender: actualSender,
      recipient: actualRecipient,
      transferredAmountUsdt: actualTransferredAmountUsdt,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      error: `Blockchain verification failed: ${errorMsg}`,
    };
  }
}

