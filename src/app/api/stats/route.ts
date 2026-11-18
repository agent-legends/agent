import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { NFT_ABI } from "@/config/abis/nft";
import { getContractConfig } from "@/config/contracts";
import { prisma } from "@/lib/db";

export async function GET() {
  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }

  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) {
    return NextResponse.json(
      { error: "The NFT contract address is not configured for this BNB network." },
      { status: 503 }
    );
  }

  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  let totalMinted = 1;
  let maxSupply = 10000;

  try {
    const [minted, maximum] = await Promise.all([
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "totalMinted",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "MAX_SUPPLY",
        authorizationList: undefined,
      }),
    ]);
    totalMinted = Number(minted);
    maxSupply = Number(maximum);
  } catch (onChainError) {
    console.warn("Could not read on-chain supply from RPC:", onChainError);
  }

  let indexedStatsAvailable = true;
  let indexed: {
    totalStaked: number | null;
    totalSpins: number | null;
    totalWinners: number | null;
    totalRewardsDistributedUsdt: number | null;
    pendingPayoutsCount: number | null;
    pendingPayoutsAmountUsdt: number | null;
    paidPayoutsAmountUsdt: number | null;
    totalUsers: number | null;
  } = {
    totalStaked: 0,
    totalSpins: 0,
    totalWinners: 0,
    totalRewardsDistributedUsdt: 0,
    pendingPayoutsCount: 0,
    pendingPayoutsAmountUsdt: 0,
    paidPayoutsAmountUsdt: 0,
    totalUsers: 0,
  };

  try {
    const [
      staked,
      totalUsers,
      totalSpins,
      totalWinningSpins,
      pendingPayouts,
      paidPayouts,
    ] = await Promise.all([
      prisma.user.aggregate({ _sum: { totalStaked: true } }).catch(() => ({ _sum: { totalStaked: 0 } })),
      prisma.user.count().catch(() => 0),
      prisma.spin.count().catch(() => 0),
      prisma.spin.count({ where: { isWinner: true } }).catch(() => 0),
      prisma.payout.aggregate({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { rewardAmountUsdt: true },
        _count: true,
      }).catch(() => ({ _sum: { rewardAmountUsdt: 0 }, _count: 0 })),
      prisma.payout.aggregate({
        where: { status: "PAID" },
        _sum: { rewardAmountUsdt: true },
      }).catch(() => ({ _sum: { rewardAmountUsdt: 0 } })),
    ]);
    indexed = {
      totalStaked: staked._sum.totalStaked ?? 0,
      totalSpins,
      totalWinners: totalWinningSpins,
      totalRewardsDistributedUsdt: paidPayouts._sum.rewardAmountUsdt ?? 0,
      pendingPayoutsCount: pendingPayouts._count,
      pendingPayoutsAmountUsdt: pendingPayouts._sum.rewardAmountUsdt ?? 0,
      paidPayoutsAmountUsdt: paidPayouts._sum.rewardAmountUsdt ?? 0,
      totalUsers,
    };
  } catch (error: unknown) {
    console.error("Indexed platform statistics could not be loaded:", error);
    indexedStatsAvailable = false;
  }

  return NextResponse.json({
    totalSupply: maxSupply,
    totalMinted,
    remainingSupply: Math.max(0, maxSupply - totalMinted),
    platformFeeUsdPerNft: 0.1,
    indexedStatsAvailable,
    ...indexed,
  });
}
