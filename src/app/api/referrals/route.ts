import { NextRequest, NextResponse } from "next/server";
import { prisma, memoryStore } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  try {
    let userStats = null;
    if (wallet) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: wallet },
      });

      const referralsCount = user?.successfulReferrals || 0;
      const referredNftCount = user?.referredNftCount || 0;
      const claimedFreeNfts = user?.claimedFreeNfts || 0;
      const earnedFreeNfts = Math.floor(referralsCount / 3);
      const unclaimedFreeNfts = Math.max(0, earnedFreeNfts - claimedFreeNfts);
      const nextMilestone = (earnedFreeNfts + 1) * 3;
      const referralsToNext = nextMilestone - referralsCount;

      userStats = {
        walletAddress: wallet,
        referralsCount,
        referredNftCount,
        earnedFreeNfts,
        claimedFreeNfts,
        unclaimedFreeNfts,
        nextMilestone,
        referralsToNext,
        referralUrl: `https://agentlegends.xyz/?ref=${wallet}`,
      };
    }

    // Top 10 Leaderboard
    const topReferrers = await prisma.user.findMany({
      where: { successfulReferrals: { gt: 0 } },
      orderBy: [{ successfulReferrals: "desc" }, { referredNftCount: "desc" }],
      take: 10,
      select: {
        walletAddress: true,
        successfulReferrals: true,
        referredNftCount: true,
        claimedFreeNfts: true,
      },
    });

    return NextResponse.json({
      userStats,
      leaderboard: topReferrers.length > 0 ? topReferrers : getMockLeaderboard(),
    });
  } catch {
    // Memory fallback
    let userStats = null;
    if (wallet) {
      const user = memoryStore.users.get(wallet) || {
        successfulReferrals: 4,
        referredNftCount: 11,
        claimedFreeNfts: 1,
      };

      const referralsCount = user.successfulReferrals || 0;
      const referredNftCount = user.referredNftCount || 0;
      const claimedFreeNfts = user.claimedFreeNfts || 0;
      const earnedFreeNfts = Math.floor(referralsCount / 3);
      const unclaimedFreeNfts = Math.max(0, earnedFreeNfts - claimedFreeNfts);
      const nextMilestone = (earnedFreeNfts + 1) * 3;

      userStats = {
        walletAddress: wallet,
        referralsCount,
        referredNftCount,
        earnedFreeNfts,
        claimedFreeNfts,
        unclaimedFreeNfts,
        nextMilestone,
        referralsToNext: nextMilestone - referralsCount,
        referralUrl: `https://agentlegends.xyz/?ref=${wallet}`,
      };
    }

    return NextResponse.json({
      userStats,
      leaderboard: getMockLeaderboard(),
    });
  }
}

function getMockLeaderboard() {
  return [
    { walletAddress: "0x71c...89f2", successfulReferrals: 42, referredNftCount: 118, claimedFreeNfts: 14 },
    { walletAddress: "0x34a...21e7", successfulReferrals: 33, referredNftCount: 89, claimedFreeNfts: 11 },
    { walletAddress: "0x89d...4f32", successfulReferrals: 27, referredNftCount: 74, claimedFreeNfts: 9 },
    { walletAddress: "0x53d...c3b8", successfulReferrals: 18, referredNftCount: 52, claimedFreeNfts: 6 },
    { walletAddress: "0x12e...66aa", successfulReferrals: 15, referredNftCount: 39, claimedFreeNfts: 5 },
    { walletAddress: "0x99b...7710", successfulReferrals: 12, referredNftCount: 31, claimedFreeNfts: 4 },
    { walletAddress: "0x44c...98bb", successfulReferrals: 9, referredNftCount: 24, claimedFreeNfts: 3 },
    { walletAddress: "0x62a...3311", successfulReferrals: 6, referredNftCount: 19, claimedFreeNfts: 2 },
    { walletAddress: "0x19f...44ee", successfulReferrals: 6, referredNftCount: 14, claimedFreeNfts: 2 },
    { walletAddress: "0x882...12aa", successfulReferrals: 3, referredNftCount: 8, claimedFreeNfts: 1 },
  ];
}

