import { NextRequest, NextResponse } from "next/server";
import { prisma, memoryStore } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const where: any = {};
    if (wallet) where.walletAddress = wallet;

    const spins = await prisma.spin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        payout: true,
      },
    });

    return NextResponse.json({ spins });
  } catch {
    let list = [...memoryStore.spins];
    if (wallet) {
      list = list.filter((s) => s.walletAddress === wallet);
    }
    return NextResponse.json({ spins: list.slice(0, limit) });
  }
}

