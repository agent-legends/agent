import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  try {
    const [user, leaderboard] = await Promise.all([
      wallet
        ? prisma.user.findUnique({ where: { walletAddress: wallet } })
        : Promise.resolve(null),
      prisma.user.findMany({
        where: { successfulReferrals: { gt: 0 } },
        orderBy: [{ successfulReferrals: "desc" }, { referredNftCount: "desc" }],
        take: 10,
        select: {
          walletAddress: true,
          successfulReferrals: true,
          referredNftCount: true,
          claimedFreeNfts: true,
        },
      }),
    ]);

    const referralsCount = user?.successfulReferrals ?? 0;
    const earnedFreeNfts = Math.floor(referralsCount / 3);
    const claimedFreeNfts = user?.claimedFreeNfts ?? 0;
    const userStats = wallet
      ? {
          walletAddress: wallet,
          referralsCount,
          referredNftCount: user?.referredNftCount ?? 0,
          earnedFreeNfts,
          claimedFreeNfts,
          unclaimedFreeNfts: Math.max(0, earnedFreeNfts - claimedFreeNfts),
          nextMilestone: (earnedFreeNfts + 1) * 3,
          referralsToNext: (earnedFreeNfts + 1) * 3 - referralsCount,
          referralUrl: `https://agentlegends.xyz/?ref=${wallet}`,
        }
      : null;

    return NextResponse.json({ userStats, leaderboard });
  } catch (error: unknown) {
    console.error("Referral data could not be loaded:", error);
    return NextResponse.json({ error: "Referral data is temporarily unavailable." }, { status: 503 });
  }
}
