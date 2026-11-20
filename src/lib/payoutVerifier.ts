import {
  createPublicClient,
  http,
  parseAbiItem,
  parseUnits,
} from "viem";
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
const MIN_CONFIRMATIONS = 3n;

export async function verifyUsdtPayoutTransaction(
  txHash: `0x${string}`,
  expectedWinnerWallet: `0x${string}`,
  expectedAmountUsdt: number,
  chainId: 56 | 97
): Promise<PayoutVerificationResult> {
  const config = CONTRACT_ADDRESSES[chainId];
  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      return { isValid: false, error: "Transaction reverted on BNB Smart Chain." };
    }

    const latestBlock = await client.getBlockNumber();
    if (latestBlock - receipt.blockNumber + 1n < MIN_CONFIRMATIONS) {
      return { isValid: false, error: "Transaction is awaiting required BNB Chain confirmations." };
    }

    const tokenAddress = config.usdt.toLowerCase();
    const expectedRecipient = expectedWinnerWallet.toLowerCase();
    const expectedAmountRaw = parseUnits(expectedAmountUsdt.toFixed(2), config.usdtDecimals);
    const blockTransfers = await client.getLogs({
      address: config.usdt as `0x${string}`,
      event: TRANSFER_EVENT_ABI,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    const matchingTransfers = blockTransfers.filter(
      (log) =>
        log.transactionHash.toLowerCase() === txHash.toLowerCase() &&
        log.args.to.toLowerCase() === expectedRecipient
    );
    const transferredToWinner = matchingTransfers.reduce((sum, log) => sum + log.args.value, 0n);

    if (matchingTransfers.length !== 1 || transferredToWinner !== expectedAmountRaw) {
      return {
        isValid: false,
        error: `Expected one ${expectedAmountUsdt.toFixed(2)} USDT transfer to ${expectedWinnerWallet} from the configured token contract; found ${matchingTransfers} transfer(s).`,
      };
    }

    return {
      isValid: true,
      blockNumber: receipt.blockNumber,
      sender: matchingTransfers[0].args.from,
      recipient: expectedRecipient,
      transferredAmountUsdt: expectedAmountUsdt,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown blockchain verification error.";
    return { isValid: false, error: `BNB Chain verification failed: ${message}` };
  }
}
