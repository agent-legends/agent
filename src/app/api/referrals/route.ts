import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  try {
    let userStats = null;
    if (wallet) {
      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { walletAddress: wallet },
        });
      } catch (dbErr) {
        console.warn("Database user fetch error in referrals:", dbErr);
      }

      const referralsCount = user?.successfulReferrals ?? 0;
      const referredNftCount = user?.referredNftCount ?? 0;
      const earnedFreeNfts = Math.floor(referralsCount / 3);
      const claimedFreeNfts = user?.claimedFreeNfts ?? 0;
      const unclaimedCount = Math.max(0, earnedFreeNfts - claimedFreeNfts);

      userStats = {
        walletAddress: wallet,
        referralsCount,
        referredNftCount,
        earnedFreeNfts,
        claimedFreeNfts,
        unclaimedFreeNfts: unclaimedCount,
        nextMilestone: (earnedFreeNfts + 1) * 3,
        referralsToNext: Math.max(1, (earnedFreeNfts + 1) * 3 - referralsCount),
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
          successfulReferrals: true,
          referredNftCount: true,
          claimedFreeNfts: true,
        },
      });

      leaderboard = trackedUsers.map((u) => ({
        walletAddress: u.walletAddress,
        successfulReferrals: u.successfulReferrals,
        referredNftCount: u.referredNftCount,
        claimedFreeNfts: u.claimedFreeNfts,
      }));
    } catch (error: unknown) {
      console.warn("Referral leaderboard from database could not be loaded:", error);
      leaderboardError = null;
    }

    return NextResponse.json({ userStats, leaderboard, leaderboardError });
  } catch (error: unknown) {
    console.error("Referral data could not be loaded:", error);
    return NextResponse.json({ error: "Referral data is temporarily unavailable." }, { status: 503 });
  }
}
