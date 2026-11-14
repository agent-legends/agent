import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { getAdminSessionWallet } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const rawLimit = searchParams.get("limit") || "20";
  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Limit must be an integer from 1 to 100." }, { status: 400 });
  }
  if (wallet && !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }
  if (!wallet && !getAdminSessionWallet(req)) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  try {
    const spins = await prisma.spin.findMany({
      where: wallet ? { walletAddress: wallet } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        spinId: true,
        walletAddress: true,
        outcome: true,
        rewardAmountUsdt: true,
        isFreeSpinAwarded: true,
        isWinner: true,
        payoutStatus: true,
        randomNumber: wallet ? false : true,
        createdAt: true,
      },
    });
    return NextResponse.json({ spins });
  } catch (error: unknown) {
    console.error("Spin history could not be loaded:", error);
    return NextResponse.json({ error: "Spin history is temporarily unavailable." }, { status: 503 });
  }
}
