import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAddress, verifyMessage } from "viem";
import { createSpinMessage } from "@/lib/authMessages";
import { prisma } from "@/lib/db";
import { executeSecureBackendSpin, SPIN_REWARDS } from "@/lib/spinEngine";

const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicSpin(spin: {
  spinId: string;
  walletAddress: string;
  outcome: string;
  rewardAmountUsdt: number;
  isFreeSpinAwarded: boolean;
  isWinner: boolean;
  createdAt: Date;
}) {
  const reward = SPIN_REWARDS.find((entry) => entry.outcome === spin.outcome);
  return {
    spinId: spin.spinId,
    walletAddress: spin.walletAddress,
    outcome: spin.outcome,
    label: reward?.label ?? spin.outcome,
    rewardAmountUsdt: spin.rewardAmountUsdt,
    isFreeSpinAwarded: spin.isFreeSpinAwarded,
    isWinner: spin.isWinner,
    timestamp: spin.createdAt.toISOString(),
    requiresPayout: spin.rewardAmountUsdt > 0,
  };
}

class NoSpinCreditsError extends Error {}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("walletAddress" in body) ||
    !("requestId" in body) ||
    !("timestamp" in body) ||
    !("signature" in body)
  ) {
    return NextResponse.json({ error: "Invalid spin request." }, { status: 400 });
  }

  const { walletAddress, requestId, timestamp, signature } = body as {
    walletAddress: unknown;
    requestId: unknown;
    timestamp: unknown;
    signature: unknown;
  };

  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    typeof requestId !== "string" ||
    !REQUEST_ID_PATTERN.test(requestId) ||
    typeof timestamp !== "number" ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS ||
    typeof signature !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(signature)
  ) {
    return NextResponse.json({ error: "Invalid or expired spin authorization." }, { status: 400 });
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const message = createSpinMessage(normalizedWallet, timestamp, requestId);
  let signatureMatches = false;
  try {
    signatureMatches = await verifyMessage({
      address: walletAddress,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    signatureMatches = false;
  }

  if (!signatureMatches) {
    return NextResponse.json({ error: "Wallet signature is invalid." }, { status: 401 });
  }

  try {
    const previousSpin = await prisma.spin.findUnique({ where: { requestId } });
    if (previousSpin) {
      if (previousSpin.walletAddress !== normalizedWallet) {
        return NextResponse.json({ error: "Request ID has already been used." }, { status: 409 });
      }
      const user = await prisma.user.findUnique({ where: { walletAddress: normalizedWallet } });
      return NextResponse.json({
        success: true,
        spin: publicSpin(previousSpin),
        remainingSpins: user?.availableSpins ?? 0,
      });
    }

    const user = await prisma.user.findUnique({ where: { walletAddress: normalizedWallet } });
    if (!user) {
      return NextResponse.json(
        { error: "No user record found. Mint or stake an NFT before spinning." },
        { status: 404 }
      );
    }

    const result = executeSecureBackendSpin(normalizedWallet);
    const spin = await prisma.$transaction(
      async (tx) => {
        const debit = await tx.user.updateMany({
          where: { walletAddress: normalizedWallet, availableSpins: { gt: 0 } },
          data: {
            availableSpins: { decrement: 1 },
            totalSpins: { increment: 1 },
            totalRewardsWonUsdt: { increment: result.rewardAmountUsdt },
            pendingPayoutUsdt: {
              increment: result.requiresPayout ? result.rewardAmountUsdt : 0,
            },
          },
        });
        if (debit.count !== 1) throw new NoSpinCreditsError();

        const createdSpin = await tx.spin.create({
          data: {
            spinId: result.spinId,
            requestId,
            walletAddress: normalizedWallet,
            outcome: result.outcome,
            rewardAmountUsdt: result.rewardAmountUsdt,
            isFreeSpinAwarded: result.isFreeSpinAwarded,
            randomNumber: result.randomNumber,
            isWinner: result.isWinner,
            payoutStatus: result.requiresPayout ? "PENDING" : "NONE",
          },
        });

        if (result.isFreeSpinAwarded) {
          await tx.user.update({
            where: { walletAddress: normalizedWallet },
            data: { availableSpins: { increment: 1 } },
          });
        }

        if (result.requiresPayout) {
          await tx.payout.create({
            data: {
              spinId: createdSpin.spinId,
              walletAddress: normalizedWallet,
              rewardAmountUsdt: result.rewardAmountUsdt,
            },
          });
        }

        return createdSpin;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { walletAddress: normalizedWallet },
      select: { availableSpins: true },
    });
    return NextResponse.json({
      success: true,
      spin: publicSpin(spin),
      remainingSpins: updatedUser.availableSpins,
    });
  } catch (error) {
    if (error instanceof NoSpinCreditsError) {
      return NextResponse.json(
        { error: "No spin credits available. Stake an Agent Legends NFT to earn a spin." },
        { status: 409 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previousSpin = await prisma.spin.findUnique({ where: { requestId } });
      if (previousSpin?.walletAddress === normalizedWallet) {
        const user = await prisma.user.findUnique({ where: { walletAddress: normalizedWallet } });
        return NextResponse.json({
          success: true,
          spin: publicSpin(previousSpin),
          remainingSpins: user?.availableSpins ?? 0,
        });
      }
      return NextResponse.json({ error: "Request ID has already been used." }, { status: 409 });
    }

    console.error("Spin execution error:", error);
    return NextResponse.json({ error: "Spin could not be completed. No credit was consumed." }, { status: 500 });
  }
}
