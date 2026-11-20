import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAdminSessionWallet, hasValidAdminOrigin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { getVerifiedRewardMilestone } from "@/lib/rewardEngine";

function secureShuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomUsdt(min: number, max: number): number {
  const minCents = Math.ceil(min * 100);
  const maxCents = Math.floor(max * 100);
  if (maxCents < minCents) return minCents / 100;
  return crypto.randomInt(minCents, maxCents + 1) / 100;
}

export async function GET(req: NextRequest) {
  const adminWallet = getAdminSessionWallet(req);
  if (!adminWallet) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });

  const milestone = await getVerifiedRewardMilestone();
  const [tiers, pool, claims, batches] = await Promise.all([
    prisma.rewardConfiguration.findMany({ orderBy: { outcome: "asc" } }),
    prisma.bonusPool.findUnique({ where: { id: "BONUS_POOL" } }),
    prisma.rewardClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { payout: true, bonusEntry: true },
    }),
    prisma.bonusSelectionBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { entries: true },
    }),
  ]);
  return NextResponse.json({ milestone, tiers, pool, claims, batches });
}

export async function POST(req: NextRequest) {
  if (!hasValidAdminOrigin(req)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const adminWallet = getAdminSessionWallet(req);
  if (!adminWallet) return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });

  const body: unknown = await req.json();
  if (typeof body !== "object" || body === null || !("action" in body)) {
    return NextResponse.json({ error: "Invalid reward administration request." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;
  const action = payload.action;

  try {
    if (action === "CONFIGURE_TIERS") {
      if (!Array.isArray(payload.tiers)) {
        return NextResponse.json({ error: "Reward tiers are required." }, { status: 400 });
      }
      const tiers = payload.tiers as Array<Record<string, unknown>>;
      const preSum = tiers.reduce((sum, tier) => sum + (typeof tier.preMilestoneBps === "number" ? tier.preMilestoneBps : 0), 0);
      const postSum = tiers.reduce((sum, tier) => sum + (typeof tier.postMilestoneBps === "number" ? tier.postMilestoneBps : 0), 0);
      if (preSum !== 10_000 || postSum !== 10_000) {
        return NextResponse.json({ error: "Pre-milestone and post-milestone probabilities must each total 100%." }, { status: 400 });
      }
      await prisma.$transaction(
        tiers.map((tier) => prisma.rewardConfiguration.update({
          where: { outcome: String(tier.outcome) },
          data: {
            label: typeof tier.label === "string" ? tier.label.slice(0, 100) : undefined,
            rewardAmountUsdt: typeof tier.rewardAmountUsdt === "number" ? tier.rewardAmountUsdt : undefined,
            preMilestoneBps: typeof tier.preMilestoneBps === "number" ? tier.preMilestoneBps : undefined,
            postMilestoneBps: typeof tier.postMilestoneBps === "number" ? tier.postMilestoneBps : undefined,
            enabled: typeof tier.enabled === "boolean" ? tier.enabled : undefined,
          },
        }))
      );
      await prisma.adminAuditLog.create({
        data: { adminWallet, action: "REWARD_CONFIG_UPDATED", details: JSON.stringify({ preSum, postSum }) },
      });
      return NextResponse.json({ success: true, preSum, postSum });
    }

    if (action === "CONFIGURE_POOL") {
      const budgetUsdt = Number(payload.budgetUsdt);
      const minimumAmountUsdt = Number(payload.minimumAmountUsdt);
      const maximumAmountUsdt = Number(payload.maximumAmountUsdt);
      const maximumSelections = Number(payload.maximumSelections);
      if (
        !Number.isFinite(budgetUsdt) || budgetUsdt < 0 ||
        !Number.isFinite(minimumAmountUsdt) || minimumAmountUsdt < 0.01 ||
        !Number.isFinite(maximumAmountUsdt) || maximumAmountUsdt < minimumAmountUsdt ||
        !Number.isInteger(maximumSelections) || maximumSelections < 1
      ) {
        return NextResponse.json({ error: "Invalid bonus pool configuration." }, { status: 400 });
      }
      const existing = await prisma.bonusPool.findUnique({ where: { id: "BONUS_POOL" } });
      const allocated = existing ? Math.max(0, existing.budgetUsdt - existing.remainingUsdt) : 0;
      const nextRemaining = Math.max(0, Math.round((budgetUsdt - allocated) * 100) / 100);
      const pool = await prisma.bonusPool.upsert({
        where: { id: "BONUS_POOL" },
        create: {
          budgetUsdt,
          remainingUsdt: budgetUsdt,
          minimumAmountUsdt,
          maximumAmountUsdt,
          maximumSelections,
          selectionFrequency: typeof payload.selectionFrequency === "string" ? payload.selectionFrequency : "MANUAL",
          selectionStatus: typeof payload.selectionStatus === "string" ? payload.selectionStatus : "ACTIVE",
        },
        update: {
          budgetUsdt,
          remainingUsdt: existing ? nextRemaining : budgetUsdt,
          minimumAmountUsdt,
          maximumAmountUsdt,
          maximumSelections,
          selectionFrequency: typeof payload.selectionFrequency === "string" ? payload.selectionFrequency : "MANUAL",
          selectionStatus: typeof payload.selectionStatus === "string" ? payload.selectionStatus : "ACTIVE",
        },
      });
      await prisma.adminAuditLog.create({
        data: { adminWallet, action: "BONUS_POOL_CONFIGURED", details: JSON.stringify(payload) },
      });
      return NextResponse.json({ success: true, pool });
    }

    if (action === "START_BONUS_SELECTION") {
      const result = await prisma.$transaction(async (tx) => {
        const pool = await tx.bonusPool.findUnique({ where: { id: "BONUS_POOL" } });
        if (!pool || pool.selectionStatus !== "ACTIVE") throw new Error("Bonus selection is not active.");
        if (pool.remainingUsdt <= 0) throw new Error("The bonus pool has no remaining budget.");

        const eligible = await tx.rewardClaim.findMany({
          where: { isBonus: true, status: "AWAITING_RANDOM_SELECTION" },
          orderBy: { createdAt: "asc" },
        });
        if (eligible.length === 0) throw new Error("No eligible submitted bonus claims are awaiting selection.");

        const shuffled = secureShuffle(eligible);
        const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const batch = await tx.bonusSelectionBatch.create({
          data: {
            batchId,
            createdBy: adminWallet,
          },
        });

        let remaining = pool.remainingUsdt;
        let allocated = 0;
        let selectedCount = 0;
        for (let i = 0; i < shuffled.length && i < pool.maximumSelections; i++) {
          const claim = shuffled[i];
          if (remaining <= 0) break;
          const maximum = Math.min(pool.maximumAmountUsdt, remaining);
          const amount = randomUsdt(pool.minimumAmountUsdt, maximum);
          if (amount > remaining) continue;

          await tx.bonusSelectionEntry.create({
            data: {
              batchId: batch.id,
              claimId: claim.id,
              walletAddress: claim.walletAddress,
              selected: true,
              rewardAmountUsdt: amount,
            },
          });
          await tx.rewardClaim.update({
            where: { id: claim.id },
            data: {
              status: "BONUS_SELECTED",
              rewardAmountUsdt: amount,
              selectedAt: new Date(),
              selectedBatchId: batch.id,
            },
          });
          allocated += amount;
          remaining -= amount;
          selectedCount++;
        }

        const selectedIds = new Set(
          (await tx.bonusSelectionEntry.findMany({ where: { batchId: batch.id }, select: { claimId: true } })).map((entry) => entry.claimId)
        );
        const unselected = shuffled.filter((claim) => !selectedIds.has(claim.id));
        await Promise.all(unselected.map((claim) =>
          tx.rewardClaim.update({
            where: { id: claim.id },
            data: { status: "BONUS_NOT_SELECTED" },
          })
        ));
        await Promise.all(unselected.map((claim) =>
          tx.bonusSelectionEntry.create({
            data: {
              batchId: batch.id,
              claimId: claim.id,
              walletAddress: claim.walletAddress,
              selected: false,
              rewardAmountUsdt: null,
            },
          })
        ));

        const roundedRemaining = Math.round(remaining * 100) / 100;
        await tx.bonusPool.update({
          where: { id: "BONUS_POOL" },
          data: { remainingUsdt: roundedRemaining },
        });
        await tx.bonusSelectionBatch.update({
          where: { id: batch.id },
          data: {
            selectedCount,
            unselectedCount: unselected.length,
            allocatedUsdt: Math.round(allocated * 100) / 100,
            remainingPoolUsdt: roundedRemaining,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            adminWallet,
            action: "BONUS_SELECTION_COMPLETED",
            targetId: batch.batchId,
            details: JSON.stringify({ selectedCount, unselectedCount: unselected.length, allocatedUsdt: allocated, remainingPoolUsdt: roundedRemaining }),
          },
        });
        return { batchId: batch.batchId, selectedCount, unselectedCount: unselected.length, allocatedUsdt: allocated, remainingPoolUsdt: roundedRemaining };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return NextResponse.json({ success: true, result });
    }

    if (action === "APPROVE_CLAIM" || action === "REJECT_CLAIM") {
      const claimId = typeof payload.claimId === "string" ? payload.claimId : "";
      if (!claimId) return NextResponse.json({ error: "Claim ID is required." }, { status: 400 });
      const claim = await prisma.rewardClaim.findUnique({ where: { claimId } });
      if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });

      if (action === "APPROVE_CLAIM") {
        if (claim.status === "AWAITING_RANDOM_SELECTION") {
          return NextResponse.json({ error: "The claim is still awaiting random selection." }, { status: 409 });
        }
        const amount = claim.rewardAmountUsdt;
        if (claim.status !== "SUBMITTED" && claim.status !== "UNDER_REVIEW" && claim.status !== "BONUS_SELECTED") {
          return NextResponse.json({ error: "Only submitted or selected claims can be approved." }, { status: 409 });
        }
        if (amount == null || amount <= 0) return NextResponse.json({ error: "The claim has no payable reward amount." }, { status: 422 });

        await prisma.$transaction(async (tx) => {
          await tx.rewardClaim.update({
            where: { id: claim.id },
            data: { status: "APPROVED", adminNote: typeof payload.adminNote === "string" ? payload.adminNote.slice(0, 500) : null },
          });
          await tx.rewardReview.create({
            data: { claimId: claim.id, adminWallet, action: "APPROVED", note: typeof payload.adminNote === "string" ? payload.adminNote.slice(0, 500) : null },
          });
          await tx.payout.upsert({
            where: { spinId: claim.spinId },
            create: { spinId: claim.spinId, claimId: claim.id, walletAddress: claim.walletAddress, rewardAmountUsdt: amount, status: "PENDING" },
            update: { claimId: claim.id, rewardAmountUsdt: amount, status: "PENDING" },
          });
          await tx.spin.update({ where: { spinId: claim.spinId }, data: { payoutStatus: "APPROVED" } });
          await tx.user.update({ where: { walletAddress: claim.walletAddress }, data: { pendingPayoutUsdt: { increment: amount } } });
          await tx.adminAuditLog.create({
            data: { adminWallet, action: "CLAIM_APPROVED", targetId: claim.claimId, details: JSON.stringify({ walletAddress: claim.walletAddress, amountUsdt: amount }) },
          });
        });
        return NextResponse.json({ success: true, status: "APPROVED" });
      }

      const reason = typeof payload.rejectionReason === "string" ? payload.rejectionReason.trim().slice(0, 500) : "";
      if (!reason) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.rewardClaim.update({
          where: { id: claim.id },
          data: { status: "REJECTED", rejectionReason: reason, adminNote: typeof payload.adminNote === "string" ? payload.adminNote.slice(0, 500) : null },
        });
        await tx.rewardReview.create({ data: { claimId: claim.id, adminWallet, action: "REJECTED", note: reason } });
        await tx.spin.update({ where: { spinId: claim.spinId }, data: { payoutStatus: "REJECTED" } });
        await tx.adminAuditLog.create({
          data: { adminWallet, action: "CLAIM_REJECTED", targetId: claim.claimId, details: JSON.stringify({ reason }) },
        });
      });
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    return NextResponse.json({ error: "Unsupported reward administration action." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Reward administration failed:", error);
    return NextResponse.json({ error: "Reward administration action could not be completed." }, { status: 500 });
  }
}
