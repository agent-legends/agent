import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "NFT staking has been retired and removed from the Agent Legends protocol." },
    { status: 410 }
  );
}
