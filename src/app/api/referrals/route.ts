import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { getContractConfig } from "@/config/contracts";
import { NFT_ABI } from "@/config/abis/nft";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) {
    return NextResponse.json({ error: "NFT contract address is not configured for this chain." }, { status: 503 });
  }

  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    let userStats = null;
    if (wallet) {
      const [successfulReferrals, unclaimedFreeNfts] = await Promise.all([
        client.readContract({
          address: config.nft,
          abi: NFT_ABI,
          functionName: "successfulReferrals",
          args: [wallet as `0x${string}`],
        }),
        client.readContract({
          address: config.nft,
          abi: NFT_ABI,
          functionName: "referralNFTCredits",
          args: [wallet as `0x${string}`],
        }),
      ]);
      let referredNftCount: number | null = null;
      try {
        const user = await prisma.user.findUnique({
          where: { walletAddress: wallet },
          select: { referredNftCount: true },
        });
        referredNftCount = user?.referredNftCount ?? null;
      } catch (error: unknown) {
        console.error("Indexed referred NFT count could not be loaded:", error);
      }
      const referralsCount = Number(successfulReferrals);
      const earnedFreeNfts = Math.floor(referralsCount / 3);
      const unclaimedCount = Number(unclaimedFreeNfts);
      userStats = {
        walletAddress: wallet,
        referralsCount,
        referredNftCount,
        earnedFreeNfts,
        claimedFreeNfts: Math.max(0, earnedFreeNfts - unclaimedCount),
        unclaimedFreeNfts: unclaimedCount,
        nextMilestone: (earnedFreeNfts + 1) * 3,
        referralsToNext: (earnedFreeNfts + 1) * 3 - referralsCount,
        referralUrl: `https://agentlegends.xyz/?ref=${wallet}`,
      };
    }

    let leaderboard: Array<{
      walletAddress: string;
      successfulReferrals: number;
      referredNftCount: number;
      claimedFreeNfts: number;
    }> = [];
    let leaderboardError: string | null = null;
    try {
      const trackedUsers = await prisma.user.findMany({
        where: { successfulReferrals: { gt: 0 } },
        orderBy: [{ successfulReferrals: "desc" }, { referredNftCount: "desc" }],
        take: 10,
        select: {
          walletAddress: true,
          referredNftCount: true,
        },
      });
      leaderboard = await Promise.all(
        trackedUsers.map(async (trackedUser) => {
          const [referrals, credits] = await Promise.all([
            client.readContract({
              address: config.nft,
              abi: NFT_ABI,
              functionName: "successfulReferrals",
              args: [trackedUser.walletAddress as `0x${string}`],
            }),
            client.readContract({
              address: config.nft,
              abi: NFT_ABI,
              functionName: "referralNFTCredits",
              args: [trackedUser.walletAddress as `0x${string}`],
            }),
          ]);
          const successfulReferrals = Number(referrals);
          const earned = Math.floor(successfulReferrals / 3);
          return {
            walletAddress: trackedUser.walletAddress,
            successfulReferrals,
            referredNftCount: trackedUser.referredNftCount,
            claimedFreeNfts: Math.max(0, earned - Number(credits)),
          };
        })
      );
      leaderboard.sort((left, right) => right.successfulReferrals - left.successfulReferrals);
    } catch (error: unknown) {
      console.error("Referral leaderboard could not be loaded:", error);
      leaderboardError = "Referral leaderboard analytics are temporarily unavailable.";
    }

    return NextResponse.json({ userStats, leaderboard, leaderboardError });
  } catch (error: unknown) {
    console.error("On-chain referral data could not be loaded:", error);
    return NextResponse.json({ error: "Referral data is temporarily unavailable." }, { status: 503 });
  }
}
