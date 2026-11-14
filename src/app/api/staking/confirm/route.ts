import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  createPublicClient,
  http,
  isAddress,
  parseAbiItem,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/db";

const STAKED_EVENT = parseAbiItem(
  "event NftStaked(address indexed user, uint256 indexed tokenId, uint64 stakedAt, bool generatedSpin)"
);
const UNSTAKED_EVENT = parseAbiItem(
  "event NftUnstaked(address indexed user, uint256 indexed tokenId, uint256 durationStaked)"
);
const INITIAL_SPIN_EVENT = parseAbiItem(
  "event InitialSpinGenerated(address indexed user, uint256 indexed tokenId)"
);
const MIN_CONFIRMATIONS = 3n;

class StakingRecordOutOfSyncError extends Error {}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("walletAddress" in body) ||
    !("txHash" in body)
  ) {
    return NextResponse.json({ error: "Wallet address and transaction hash are required." }, { status: 400 });
  }

  const { walletAddress, txHash } = body as { walletAddress: unknown; txHash: unknown };
  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    typeof txHash !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(txHash)
  ) {
    return NextResponse.json({ error: "Invalid wallet address or transaction hash." }, { status: 400 });
  }

  const chainId = Number(process.env.BSC_CHAIN_ID || "97");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = CONTRACT_ADDRESSES[chainId];
  if (!isAddress(config.staking)) {
    return NextResponse.json(
      { error: "Staking contract address is not configured for this chain." },
      { status: 503 }
    );
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedHash = txHash.toLowerCase() as `0x${string}`;
  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const recorded = await prisma.transaction.findUnique({ where: { txHash: normalizedHash } });
    if (recorded) {
      if (recorded.walletAddress !== normalizedWallet || !["STAKE", "UNSTAKE"].includes(recorded.type)) {
        return NextResponse.json({ error: "Transaction hash is already associated with another record." }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        alreadyRecorded: true,
        metadata: recorded.metadata ? JSON.parse(recorded.metadata) : null,
      });
    }

    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: normalizedHash }),
      client.getTransactionReceipt({ hash: normalizedHash }),
    ]);
    if (transaction.from.toLowerCase() !== normalizedWallet) {
      return NextResponse.json({ error: "Transaction sender does not match the wallet." }, { status: 403 });
    }
    if (transaction.to?.toLowerCase() !== config.staking.toLowerCase()) {
      return NextResponse.json({ error: "Transaction did not call the configured staking contract." }, { status: 422 });
    }
    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Staking transaction reverted." }, { status: 422 });
    }
    if ((await client.getBlockNumber()) - receipt.blockNumber + 1n < MIN_CONFIRMATIONS) {
      return NextResponse.json({ error: "Staking transaction is awaiting required confirmations." }, { status: 409 });
    }

    const [stakeLogs, unstakeLogs, initialSpinLogs] = await Promise.all([
      client.getLogs({
        address: config.staking as `0x${string}`,
        event: STAKED_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      }),
      client.getLogs({
        address: config.staking as `0x${string}`,
        event: UNSTAKED_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      }),
      client.getLogs({
        address: config.staking as `0x${string}`,
        event: INITIAL_SPIN_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      }),
    ]);
    const transactionStakeLogs = stakeLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.user.toLowerCase() === normalizedWallet
    );
    const transactionUnstakeLogs = unstakeLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.user.toLowerCase() === normalizedWallet
    );
    const transactionInitialSpinLogs = initialSpinLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.user.toLowerCase() === normalizedWallet
    );
    const stakedCount = transactionStakeLogs.length;
    const unstakedCount = transactionUnstakeLogs.length;
    const initialSpinCount = transactionInitialSpinLogs.length;
    const generatedSpinCount = transactionStakeLogs.filter((log) => log.args.generatedSpin).length;
    const tokenIds = [
      ...transactionStakeLogs.map((log) => log.args.tokenId.toString()),
      ...transactionUnstakeLogs.map((log) => log.args.tokenId.toString()),
    ];

    if (
      stakedCount + unstakedCount === 0 ||
      initialSpinCount > stakedCount ||
      generatedSpinCount !== initialSpinCount ||
      stakedCount < unstakedCount
    ) {
      return NextResponse.json({ error: "No valid staking events were found for this wallet." }, { status: 422 });
    }

    const metadata = { stakedCount, unstakedCount, initialSpinCount, tokenIds };
    const type = stakedCount > 0 ? "STAKE" : "UNSTAKE";
    await prisma.$transaction(
      async (tx) => {
        await tx.user.upsert({
          where: { walletAddress: normalizedWallet },
          create: { walletAddress: normalizedWallet },
          update: {},
        });
        await tx.transaction.create({
          data: {
            txHash: normalizedHash,
            walletAddress: normalizedWallet,
            type,
            amount: initialSpinCount.toString(),
            metadata: JSON.stringify(metadata),
          },
        });

        const changeInStake = stakedCount - unstakedCount;
        const data = {
          availableSpins: { increment: initialSpinCount },
          ...(changeInStake > 0
            ? { totalStaked: { increment: changeInStake } }
            : changeInStake < 0
              ? { totalStaked: { decrement: -changeInStake } }
              : {}),
        };
        if (changeInStake < 0) {
          const updated = await tx.user.updateMany({
            where: { walletAddress: normalizedWallet, totalStaked: { gte: -changeInStake } },
            data,
          });
          if (updated.count !== 1) throw new StakingRecordOutOfSyncError();
        } else {
          await tx.user.update({ where: { walletAddress: normalizedWallet }, data });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ success: true, ...metadata });
  } catch (error: unknown) {
    if (error instanceof StakingRecordOutOfSyncError) {
      return NextResponse.json(
        { error: "Dashboard staking totals are out of sync. Contact support before resubmitting." },
        { status: 409 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.transaction.findUnique({ where: { txHash: normalizedHash } });
      if (existing?.walletAddress === normalizedWallet && ["STAKE", "UNSTAKE"].includes(existing.type)) {
        return NextResponse.json({
          success: true,
          alreadyRecorded: true,
          metadata: existing.metadata ? JSON.parse(existing.metadata) : null,
        });
      }
      return NextResponse.json({ error: "Transaction was already recorded." }, { status: 409 });
    }
    console.error("Staking transaction synchronization failed:", error);
    return NextResponse.json({ error: "Staking transaction could not be synchronized." }, { status: 503 });
  }
}
