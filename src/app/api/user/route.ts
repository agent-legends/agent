import { NextRequest, NextResponse } from "next/server";
import { prisma, memoryStore, getOrCreateUser } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  try {
    const user = await getOrCreateUser(wallet);

    // Retrieve user's recent spins and payouts
    const recentSpins = await prisma.spin.findMany({
      where: { walletAddress: wallet },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentPayouts = await prisma.payout.findMany({
      where: { walletAddress: wallet },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const successfulReferrals = user.successfulReferrals || 0;
    const earnedFreeNfts = Math.floor(successfulReferrals / 3);
    const unclaimedFreeNfts = Math.max(0, earnedFreeNfts - (user.claimedFreeNfts || 0));

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
      unclaimedFreeNfts,
      recentSpins,
      recentPayouts,
    });
  } catch {
    const user = await getOrCreateUser(wallet);
    const spins = memoryStore.spins.filter((s) => s.walletAddress === wallet);
    const payouts = memoryStore.payouts.filter((p) => p.walletAddress === wallet);

    const successfulReferrals = user.successfulReferrals || 0;
    const earnedFreeNfts = Math.floor(successfulReferrals / 3);
    const unclaimedFreeNfts = Math.max(0, earnedFreeNfts - (user.claimedFreeNfts || 0));

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
      unclaimedFreeNfts,
      recentSpins: spins.slice(0, 10),
      recentPayouts: payouts.slice(0, 10),
    });
  }
}

