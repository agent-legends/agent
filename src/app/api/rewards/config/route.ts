import { NextResponse } from "next/server";
import { getRewardTiers, getVerifiedRewardMilestone } from "@/lib/rewardEngine";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [milestone, tiers, pool] = await Promise.all([
      getVerifiedRewardMilestone(),
      getRewardTiers(),
      prisma.bonusPool.upsert({
        where: { id: "BONUS_POOL" },
        create: { remainingUsdt: 0 },
        update: {},
      }),
    ]);
    return NextResponse.json({
      milestone,
      tiers: tiers.map((tier) => ({
        outcome: tier.outcome,
        label: tier.label,
        rewardAmountUsdt: tier.rewardAmountUsdt,
        preMilestoneBps: tier.preMilestoneBps,
        postMilestoneBps: tier.postMilestoneBps,
        enabled: tier.enabled,
      })),
      bonusPool: {
        budgetUsdt: pool.budgetUsdt,
        remainingUsdt: pool.remainingUsdt,
        minimumAmountUsdt: pool.minimumAmountUsdt,
        maximumAmountUsdt: pool.maximumAmountUsdt,
        maximumSelections: pool.maximumSelections,
        selectionFrequency: pool.selectionFrequency,
        selectionStatus: pool.selectionStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Reward configuration could not be loaded:", error);
    return NextResponse.json({ error: "Reward configuration is temporarily unavailable." }, { status: 503 });
  }
}
