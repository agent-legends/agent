import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_NFT_ABI, AGENT_LEGENDS_STAKING_ABI } from "@/config/contracts";
import { prisma } from "@/lib/db";

export async function GET() {
  const chainId = Number(process.env.BSC_CHAIN_ID || "97");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }

  const config = CONTRACT_ADDRESSES[chainId];
  if (!isAddress(config.nft) || !isAddress(config.staking)) {
    return NextResponse.json(
      { error: "NFT and staking contract addresses must be configured before live statistics are available." },
      { status: 503 }
    );
  }

  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const [
      minted,
      remaining,
      staked,
      totalUsers,
      totalSpins,
      totalWinningSpins,
      pendingPayouts,
      paidPayouts,
      userRewards,
    ] = await Promise.all([
      client.readContract({
        address: config.nft,
        abi: AGENT_LEGENDS_NFT_ABI,
        functionName: "totalSupply",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: AGENT_LEGENDS_NFT_ABI,
        functionName: "remainingSupply",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.staking,
        abi: AGENT_LEGENDS_STAKING_ABI,
        functionName: "totalStakedCount",
        authorizationList: undefined,
      }),
      prisma.user.count(),
      prisma.spin.count(),
      prisma.spin.count({ where: { isWinner: true } }),
      prisma.payout.aggregate({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { rewardAmountUsdt: true },
        _count: true,
      }),
      prisma.payout.aggregate({
        where: { status: "PAID" },
        _sum: { rewardAmountUsdt: true },
        _count: true,
      }),
      prisma.user.aggregate({ _sum: { totalRewardsWonUsdt: true } }),
    ]);

    return NextResponse.json({
      totalSupply: 10000,
      totalMinted: Number(minted),
      remainingSupply: Number(remaining),
      mintPriceUsd: 0.2,
      totalStaked: Number(staked),
      totalSpins,
      totalWinners: totalWinningSpins,
      totalRewardsWonUsdt: userRewards._sum.totalRewardsWonUsdt ?? 0,
      totalRewardsDistributedUsdt: paidPayouts._sum.rewardAmountUsdt ?? 0,
      pendingPayoutsCount: pendingPayouts._count,
      pendingPayoutsAmountUsdt: pendingPayouts._sum.rewardAmountUsdt ?? 0,
      paidPayoutsCount: paidPayouts._count,
      paidPayoutsAmountUsdt: paidPayouts._sum.rewardAmountUsdt ?? 0,
      totalUsers,
    });
  } catch (error: unknown) {
    console.error("Platform statistics could not be loaded:", error);
    return NextResponse.json({ error: "Platform statistics are temporarily unavailable." }, { status: 503 });
  }
}
