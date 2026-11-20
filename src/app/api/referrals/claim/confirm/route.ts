import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Referral claims are now handled directly via free agent minting on the mint page." },
    { status: 410 }
  );
}
