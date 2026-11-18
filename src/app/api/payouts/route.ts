import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAddress } from "viem";
import { getAdminSessionWallet, hasValidAdminOrigin } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { verifyUsdtPayoutTransaction } from "@/lib/payoutVerifier";

type PayoutAction = "START_PAYOUT" | "VERIFY_PAYOUT" | "REJECT_PAYOUT";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const status = searchParams.get("status")?.toUpperCase();
  const isAdminRequest = !wallet;

  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }
  if (isAdminRequest && !getAdminSessionWallet(req)) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  if (status && !["ALL", "PENDING", "PROCESSING", "PAID", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid payout status." }, { status: 400 });
  }

  const where: Prisma.PayoutWhereInput = {};
  if (wallet) where.walletAddress = wallet;
  if (wallet) where.status = "PAID";
  if (!wallet && status && status !== "ALL") where.status = status;

  try {
    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    console.error("Payout records could not be loaded:", error);
    return NextResponse.json({ error: "Payout records are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidAdminOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const adminWallet = getAdminSessionWallet(req);
  if (!adminWallet) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("action" in body) ||
    !("spinId" in body)
  ) {
    return NextResponse.json({ error: "Invalid payout action request." }, { status: 400 });
  }

  const { action, spinId, txHash, rejectionReason, adminNote } = body as {
    action: unknown;
    spinId: unknown;
    txHash?: unknown;
    rejectionReason?: unknown;
    adminNote?: unknown;
  };
  if (
    typeof action !== "string" ||
    !["START_PAYOUT", "VERIFY_PAYOUT", "REJECT_PAYOUT"].includes(action) ||
    typeof spinId !== "string" ||
    spinId.length < 1 ||
    spinId.length > 100
  ) {
    return NextResponse.json({ error: "Invalid payout action request." }, { status: 400 });
  }

  const payoutAction = action as PayoutAction;
  try {
    const payout = await prisma.payout.findUnique({ where: { spinId } });
    if (!payout) {
      return NextResponse.json({ error: "Payout record not found." }, { status: 404 });
    }

    if (payoutAction === "START_PAYOUT") {
      const changed = await prisma.$transaction(async (tx) => {
        const result = await tx.payout.updateMany({
          where: { spinId, status: "PENDING", txHash: null },
          data: { status: "PROCESSING" },
        });
        if (result.count !== 1) return false;

        await tx.spin.update({ where: { spinId }, data: { payoutStatus: "PROCESSING" } });
        await tx.adminAuditLog.create({
          data: {
            adminWallet,
            action: "PAYOUT_PROCESSING",
            targetId: spinId,
            details: JSON.stringify({ walletAddress: payout.walletAddress }),
          },
        });
        return true;
      });

      if (!changed) {
        return NextResponse.json({ error: "Only a pending payout can be moved to processing." }, { status: 409 });
      }
      return NextResponse.json({ success: true, spinId, status: "PROCESSING" });
    }

    if (payout.status !== "PENDING" && payout.status !== "PROCESSING") {
      return NextResponse.json({ error: "This payout is already finalized." }, { status: 409 });
    }

    if (payoutAction === "VERIFY_PAYOUT") {
      if (payout.status !== "PROCESSING") {
        return NextResponse.json({ error: "Start processing before verifying a payment." }, { status: 409 });
      }
      if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json({ error: "Invalid BNB Chain transaction hash." }, { status: 400 });
      }
      const chainId = Number(process.env.BSC_CHAIN_ID || "56");
      if (chainId !== 56 && chainId !== 97) {
        return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
      }

      const normalizedTxHash = txHash.toLowerCase() as `0x${string}`;
      const verification = await verifyUsdtPayoutTransaction(
        normalizedTxHash,
        payout.walletAddress as `0x${string}`,
        payout.rewardAmountUsdt,
        chainId
      );
      if (!verification.isValid) {
        await prisma.adminAuditLog.create({
          data: {
            adminWallet,
            action: "PAYOUT_VERIFICATION_FAILED",
            targetId: spinId,
            details: JSON.stringify({
              txHash: normalizedTxHash,
              error: verification.error,
            }),
          },
        });
        return NextResponse.json(
          { error: "On-chain transaction verification failed.", details: verification.error },
          { status: 422 }
        );
      }

      try {
        await prisma.$transaction(
          async (tx) => {
            const changed = await tx.payout.updateMany({
              where: {
                spinId,
                status: { in: ["PENDING", "PROCESSING"] },
                txHash: null,
              },
              data: {
                status: "PAID",
                txHash: normalizedTxHash,
                verifiedAt: new Date(),
                adminNote: typeof adminNote === "string" ? adminNote.slice(0, 500) : null,
              },
            });
            if (changed.count !== 1) throw new Error("Payout was finalized by another request.");

            await tx.spin.update({ where: { spinId }, data: { payoutStatus: "PAID" } });
            if (payout.claimId) {
              await tx.rewardClaim.update({
                where: { id: payout.claimId },
                data: { status: "PAID" },
              });
            }
            await tx.user.update({
              where: { walletAddress: payout.walletAddress },
              data: {
                pendingPayoutUsdt: { decrement: payout.rewardAmountUsdt },
                paidPayoutUsdt: { increment: payout.rewardAmountUsdt },
              },
            });
            await tx.adminAuditLog.create({
              data: {
                adminWallet,
                action: "PAYOUT_VERIFIED",
                targetId: spinId,
                details: JSON.stringify({
                  txHash: normalizedTxHash,
                  walletAddress: payout.walletAddress,
                  amountUsdt: payout.rewardAmountUsdt,
                  blockNumber: verification.blockNumber?.toString(),
                }),
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return NextResponse.json(
            { error: "This transaction hash has already been used for another payout." },
            { status: 409 }
          );
        }
        if (error instanceof Error && error.message === "Payout was finalized by another request.") {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        spinId,
        status: "PAID",
        txHash: normalizedTxHash,
        verifiedAt: new Date().toISOString(),
      });
    }

    const reason =
      typeof rejectionReason === "string" && rejectionReason.trim()
        ? rejectionReason.trim().slice(0, 500)
        : null;
    if (!reason) {
      return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
    }

    const rejected = await prisma.$transaction(async (tx) => {
      const changed = await tx.payout.updateMany({
        where: {
          spinId,
          status: "PENDING",
          txHash: null,
        },
        data: { status: "REJECTED", rejectionReason: reason },
      });
      if (changed.count !== 1) return false;

      await tx.spin.update({ where: { spinId }, data: { payoutStatus: "REJECTED" } });
      await tx.user.update({
        where: { walletAddress: payout.walletAddress },
        data: { pendingPayoutUsdt: { decrement: payout.rewardAmountUsdt } },
      });
      await tx.adminAuditLog.create({
        data: {
          adminWallet,
          action: "PAYOUT_REJECTED",
          targetId: spinId,
          details: JSON.stringify({ reason }),
        },
      });
      return true;
    });

    if (!rejected) {
      return NextResponse.json({ error: "Only a pending payout can be rejected." }, { status: 409 });
    }
    return NextResponse.json({ success: true, spinId, status: "REJECTED" });
  } catch (error: unknown) {
    console.error("Payout action failed:", error);
    return NextResponse.json({ error: "Payout action could not be completed." }, { status: 500 });
  }
}
