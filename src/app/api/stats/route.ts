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
      totalStaked: null,
      totalSpins: null,
      totalWinners: null,
      totalRewardsDistributedUsdt: null,
      pendingPayoutsCount: null,
      pendingPayoutsAmountUsdt: null,
      paidPayoutsAmountUsdt: null,
      totalUsers: null,
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
        prisma.user.aggregate({ _sum: { totalStaked: true } }),
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
        }),
      ]);
      indexed = {
        totalStaked: staked._sum.totalStaked,
        totalSpins,
        totalWinners: totalWinningSpins,
        totalRewardsDistributedUsdt: paidPayouts._sum.rewardAmountUsdt,
        pendingPayoutsCount: pendingPayouts._count,
        pendingPayoutsAmountUsdt: pendingPayouts._sum.rewardAmountUsdt,
        paidPayoutsAmountUsdt: paidPayouts._sum.rewardAmountUsdt,
        totalUsers,
      };
    } catch (error: unknown) {
      console.error("Indexed platform statistics could not be loaded:", error);
      indexedStatsAvailable = false;
    }

    const mintedCount = Number(minted);
    const maximumCount = Number(maximum);
    return NextResponse.json({
      totalSupply: maximumCount,
      totalMinted: mintedCount,
      remainingSupply: Math.max(0, maximumCount - mintedCount),
      platformFeeUsdPerNft: 0.1,
      indexedStatsAvailable,
      ...indexed,
    });
  } catch (error: unknown) {
    console.error("On-chain supply statistics could not be loaded:", error);
    return NextResponse.json({ error: "On-chain supply statistics are temporarily unavailable." }, { status: 503 });
  }
}
