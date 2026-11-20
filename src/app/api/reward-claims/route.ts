import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createRewardClaimMessage } from "@/lib/authMessages";

const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function isValidTwitterUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return host === "x.com" || host === "www.x.com" || host === "twitter.com" || host === "www.twitter.com";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }
  const claims = await prisma.rewardClaim.findMany({
    where: { walletAddress: wallet },
    orderBy: { createdAt: "desc" },
    include: { payout: true, bonusEntry: true },
  });
  return NextResponse.json({ claims });
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid claim request." }, { status: 400 });
  }
  const {
    walletAddress,
    spinId,
    claimId,
    timestamp,
    signature,
    twitterUrl,
    publicConfirmed,
    additionalInfo,
  } = body as Record<string, unknown>;

  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    typeof spinId !== "string" ||
    typeof claimId !== "string" ||
    typeof timestamp !== "number" ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS ||
    typeof signature !== "string" ||
    typeof twitterUrl !== "string" ||
    !isValidTwitterUrl(twitterUrl) ||
    publicConfirmed !== true
  ) {
    return NextResponse.json({ error: "Invalid, expired, or incomplete claim request." }, { status: 400 });
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const message = createRewardClaimMessage(normalizedWallet, timestamp, spinId, claimId);
  let valid = false;
  try {
    valid = await verifyMessage({
      address: walletAddress,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {}
  if (!valid) {
    return NextResponse.json({ error: "Wallet signature is invalid." }, { status: 401 });
  }

  try {
    const spin = await prisma.spin.findUnique({ where: { spinId } });
    if (!spin || spin.walletAddress !== normalizedWallet) {
      return NextResponse.json({ error: "Spin not found for this wallet." }, { status: 404 });
    }
    if (spin.outcome !== "TRY_NEXT_TIME" && spin.rewardAmountUsdt <= 0) {
      return NextResponse.json({ error: "This spin does not require a reward claim." }, { status: 409 });
    }

    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.rewardClaim.create({
        data: {
          claimId,
          spinId,
          walletAddress: normalizedWallet,
          nftTokenId: spin.nftTokenId,
          outcome: spin.outcome,
          rewardAmountUsdt: spin.outcome === "TRY_NEXT_TIME" ? null : spin.rewardAmountUsdt,
          twitterUrl,
          publicConfirmed: true,
          additionalInfo: typeof additionalInfo === "string" ? additionalInfo.slice(0, 1000) : null,
          status: spin.outcome === "TRY_NEXT_TIME" ? "AWAITING_RANDOM_SELECTION" : "SUBMITTED",
          isBonus: spin.outcome === "TRY_NEXT_TIME",
        },
      });
      await tx.spin.update({
        where: { spinId },
        data: { payoutStatus: spin.outcome === "TRY_NEXT_TIME" ? "AWAITING_RANDOM_SELECTION" : "SUBMITTED" },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ success: true, claim });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.rewardClaim.findUnique({ where: { spinId } });
      if (existing?.walletAddress === normalizedWallet) {
        return NextResponse.json({ success: true, alreadyRecorded: true, claim: existing });
      }
      return NextResponse.json({ error: "This spin or claim ID has already been submitted." }, { status: 409 });
    }
    console.error("Reward claim submission failed:", error);
    return NextResponse.json({ error: "Reward claim could not be submitted." }, { status: 500 });
  }
}
