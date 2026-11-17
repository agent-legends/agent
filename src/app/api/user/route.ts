import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { getContractConfig } from "@/config/contracts";
import { NFT_ABI } from "@/config/abis/nft";
import { STAKING_ABI } from "@/config/abis/staking";
import { getOrCreateUser, prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft) || !isAddress(config.staking)) {
    return NextResponse.json({ error: "NFT and staking contracts are not configured for this chain." }, { status: 503 });
  }
  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const [user, recentSpins, recentPayouts, availableSpins, successfulReferrals, referralCredits] = await Promise.all([
      getOrCreateUser(wallet),
      prisma.spin.findMany({
        where: { walletAddress: wallet },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          spinId: true,
          outcome: true,
          rewardAmountUsdt: true,
          isFreeSpinAwarded: true,
          isWinner: true,
          payoutStatus: true,
          createdAt: true,
        },
      }),
      prisma.payout.findMany({
        where: { walletAddress: wallet },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      client.readContract({
        address: config.staking,
        abi: STAKING_ABI,
        functionName: "spinCredits",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "successfulReferrals",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "referralNFTCredits",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }),
    ]);

    const referralsCount = Number(successfulReferrals);
    const earnedFreeNfts = Math.floor(referralsCount / 3);
    const unclaimedFreeNfts = Number(referralCredits);
    return NextResponse.json({
      walletAddress: wallet,
      availableSpins: user.availableSpins,
      onChainSpinCredits: Number(availableSpins),
      totalSpins: user.totalSpins,
      totalMints: user.totalMints,
      totalStaked: user.totalStaked,
      totalRewardsWonUsdt: user.totalRewardsWonUsdt,
      pendingPayoutUsdt: user.pendingPayoutUsdt,
      paidPayoutUsdt: user.paidPayoutUsdt,
      successfulReferrals: referralsCount,
      referredNftCount: user.referredNftCount,
      claimedFreeNfts: Math.max(0, earnedFreeNfts - unclaimedFreeNfts),
      earnedFreeNfts,
      unclaimedFreeNfts,
      recentSpins,
      recentPayouts,
    });
  } catch (error: unknown) {
    console.error("User dashboard data could not be loaded:", error);
    return NextResponse.json({ error: "User data is temporarily unavailable." }, { status: 503 });
  }
}
