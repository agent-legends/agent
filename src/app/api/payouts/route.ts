import { NextRequest, NextResponse } from "next/server";
import { prisma, memoryStore } from "@/lib/db";
import { verifyUsdtPayoutTransaction } from "@/lib/payoutVerifier";
import { isAddressAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const status = searchParams.get("status")?.toUpperCase();

  try {
    const where: any = {};
    if (wallet) where.walletAddress = wallet;
    if (status && status !== "ALL") where.status = status;

    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ payouts });
  } catch {
    // Memory fallback
    let list = [...memoryStore.payouts];
    if (wallet) list = list.filter((p) => p.walletAddress === wallet);
    if (status && status !== "ALL") list = list.filter((p) => p.status === status);

    return NextResponse.json({ payouts: list });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, spinId, txHash, adminWallet, adminNote, rejectionReason, chainId } = body;

    // Check admin authorization
    if (!adminWallet || !isAddressAdmin(adminWallet)) {
      return NextResponse.json(
        { error: "Unauthorized: Wallet is not an approved admin." },
        { status: 403 }
      );
    }

    if (!spinId) {
      return NextResponse.json({ error: "Missing spinId parameter." }, { status: 400 });
    }

    if (action === "VERIFY_PAYOUT") {
      if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json(
          { error: "Invalid BNB Smart Chain transaction hash format." },
          { status: 400 }
        );
      }

      // Retrieve payout record
      let targetPayout: any;
      try {
        targetPayout = await prisma.payout.findUnique({
          where: { spinId },
        });
      } catch {
        targetPayout = memoryStore.payouts.find((p) => p.spinId === spinId);
      }

      if (!targetPayout) {
        return NextResponse.json({ error: "Payout record not found." }, { status: 404 });
      }

      if (targetPayout.status === "PAID") {
        return NextResponse.json(
          { error: "This payout has already been verified and paid. Cannot re-verify." },
          { status: 400 }
        );
      }

      // Perform strict on-chain verification
      const verifyResult = await verifyUsdtPayoutTransaction(
        txHash,
        targetPayout.walletAddress,
        targetPayout.rewardAmountUsdt,
        chainId || 97
      );

      if (!verifyResult.isValid) {
        return NextResponse.json(
          {
            error: "On-chain transaction verification failed.",
            details: verifyResult.error,
          },
          { status: 422 }
        );
      }

      // Verification successful! Update DB and log audit trail
      const now = new Date();
      try {
        await prisma.$transaction(async (tx) => {
          await tx.payout.update({
            where: { spinId },
            data: {
              status: "PAID",
              txHash,
              verifiedAt: now,
              adminNote: adminNote || `Verified by ${adminWallet}`,
            },
          });

          await tx.spin.update({
            where: { spinId },
            data: { payoutStatus: "PAID" },
          });

          await tx.user.update({
            where: { walletAddress: targetPayout.walletAddress },
            data: {
              pendingPayoutUsdt: { decrement: targetPayout.rewardAmountUsdt },
              paidPayoutUsdt: { increment: targetPayout.rewardAmountUsdt },
            },
          });

          await tx.adminAuditLog.create({
            data: {
              adminWallet: adminWallet.toLowerCase(),
              action: "PAYOUT_VERIFIED",
              targetId: spinId,
              details: JSON.stringify({
                txHash,
                winner: targetPayout.walletAddress,
                amountUsdt: targetPayout.rewardAmountUsdt,
                blockNumber: verifyResult.blockNumber?.toString(),
              }),
            },
          });
        });
      } catch {
        targetPayout.status = "PAID";
        targetPayout.txHash = txHash;
        targetPayout.verifiedAt = now;
        targetPayout.adminNote = adminNote;

        const user = memoryStore.users.get(targetPayout.walletAddress);
        if (user) {
          user.pendingPayoutUsdt = Math.max(0, (user.pendingPayoutUsdt || 0) - targetPayout.rewardAmountUsdt);
          user.paidPayoutUsdt = (user.paidPayoutUsdt || 0) + targetPayout.rewardAmountUsdt;
        }

        memoryStore.auditLogs.unshift({
          id: `log_${Date.now()}`,
          adminWallet,
          action: "PAYOUT_VERIFIED",
          targetId: spinId,
          details: { txHash, amountUsdt: targetPayout.rewardAmountUsdt },
          createdAt: now,
        });
      }

      return NextResponse.json({
        success: true,
        message: "USDT payout successfully verified and recorded on BNB Smart Chain.",
        spinId,
        status: "PAID",
        txHash,
        verifiedAt: now,
      });
    }

    if (action === "REJECT_PAYOUT") {
      let targetPayout: any;
      try {
        targetPayout = await prisma.payout.findUnique({ where: { spinId } });
      } catch {
        targetPayout = memoryStore.payouts.find((p) => p.spinId === spinId);
      }

      if (!targetPayout) {
        return NextResponse.json({ error: "Payout record not found." }, { status: 404 });
      }

      if (targetPayout.status === "PAID") {
        return NextResponse.json(
          { error: "Cannot reject an already completed and paid reward." },
          { status: 400 }
        );
      }

      try {
        await prisma.$transaction(async (tx) => {
          await tx.payout.update({
            where: { spinId },
            data: {
              status: "REJECTED",
              rejectionReason: rejectionReason || "Rejected by admin audit",
            },
          });

          await tx.spin.update({
            where: { spinId },
            data: { payoutStatus: "REJECTED" },
          });

          await tx.adminAuditLog.create({
            data: {
              adminWallet: adminWallet.toLowerCase(),
              action: "PAYOUT_REJECTED",
              targetId: spinId,
              details: JSON.stringify({ reason: rejectionReason }),
            },
          });
        });
      } catch {
        targetPayout.status = "REJECTED";
        targetPayout.rejectionReason = rejectionReason;
      }

      return NextResponse.json({
        success: true,
        message: "Payout rejected and recorded in audit log.",
        spinId,
        status: "REJECTED",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Payout update error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

