import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getOrCreateUser, prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  try {
    const user = await getOrCreateUser(wallet);
    const [recentSpins, recentPayouts] = await Promise.all([
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
    ]);

    const successfulReferrals = user.successfulReferrals;
    const earnedFreeNfts = Math.floor(successfulReferrals / 3);
    return NextResponse.json({
      walletAddress: wallet,
      availableSpins: user.availableSpins,
      totalSpins: user.totalSpins,
      totalMints: user.totalMints,
      totalStaked: user.totalStaked,
      totalRewardsWonUsdt: user.totalRewardsWonUsdt,
      pendingPayoutUsdt: user.pendingPayoutUsdt,
      paidPayoutUsdt: user.paidPayoutUsdt,
      successfulReferrals,
      referredNftCount: user.referredNftCount,
      claimedFreeNfts: user.claimedFreeNfts,
      earnedFreeNfts,
      unclaimedFreeNfts: Math.max(0, earnedFreeNfts - user.claimedFreeNfts),
      recentSpins,
      recentPayouts,
    });
  } catch (error: unknown) {
    console.error("User dashboard data could not be loaded:", error);
    return NextResponse.json({ error: "User data is temporarily unavailable." }, { status: 503 });
  }
}
