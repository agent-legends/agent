import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [paid, count, latest] = await Promise.all([
      prisma.payout.aggregate({
        where: { status: "PAID", txHash: { not: null }, verifiedAt: { not: null } },
        _sum: { rewardAmountUsdt: true },
      }),
      prisma.payout.count({
        where: { status: "PAID", txHash: { not: null }, verifiedAt: { not: null } },
      }),
      prisma.payout.findMany({
        where: { status: "PAID", txHash: { not: null }, verifiedAt: { not: null } },
        orderBy: { verifiedAt: "desc" },
        take: 50,
        select: {
          walletAddress: true,
          rewardAmountUsdt: true,
          txHash: true,
          verifiedAt: true,
          status: true,
        },
      }),
    ]);
    const pending = await prisma.payout.aggregate({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
      _sum: { rewardAmountUsdt: true },
    });
    return NextResponse.json({
      totalPaidUsdt: paid._sum.rewardAmountUsdt ?? 0,
      payoutCount: count,
      totalPendingApprovedUsdt: pending._sum.rewardAmountUsdt ?? 0,
      payouts: latest,
    });
  } catch (error: unknown) {
    console.error("Public payout history could not be loaded:", error);
    return NextResponse.json({ error: "Public payout history is temporarily unavailable." }, { status: 503 });
  }
}
