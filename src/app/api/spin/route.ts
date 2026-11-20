import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "The spin wheel has been retired and removed from the Agent Legends protocol." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "The spin wheel has been retired and removed from the Agent Legends protocol." },
    { status: 410 }
  );
}
