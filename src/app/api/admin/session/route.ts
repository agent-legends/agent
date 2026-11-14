import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  adminSessionCookie,
  createAdminSessionToken,
  getAdminSessionWallet,
  hasValidAdminOrigin,
  isAddressAdmin,
  verifyAdminSignature,
} from "@/lib/adminAuth";
import { createAdminLoginMessage } from "@/lib/authMessages";

const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const walletAddress = getAdminSessionWallet(req);
  return NextResponse.json({ authenticated: Boolean(walletAddress), walletAddress });
}

export async function POST(req: NextRequest) {
  if (!hasValidAdminOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) {
    return NextResponse.json(
      { error: "Admin sessions are unavailable until ADMIN_SESSION_SECRET is configured." },
      { status: 503 }
    );
  }

  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("walletAddress" in body) ||
    !("timestamp" in body) ||
    !("requestId" in body) ||
    !("signature" in body)
  ) {
    return NextResponse.json({ error: "Invalid admin login request." }, { status: 400 });
  }

  const { walletAddress, timestamp, requestId, signature } = body as {
    walletAddress: unknown;
    timestamp: unknown;
    requestId: unknown;
    signature: unknown;
  };
  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    !isAddressAdmin(walletAddress) ||
    typeof timestamp !== "number" ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_SIGNATURE_AGE_MS ||
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
    typeof signature !== "string"
  ) {
    return NextResponse.json({ error: "Invalid or expired admin login request." }, { status: 400 });
  }

  const message = createAdminLoginMessage(walletAddress, timestamp, requestId);
  if (!(await verifyAdminSignature(walletAddress, message, signature))) {
    return NextResponse.json({ error: "Admin wallet signature is invalid." }, { status: 401 });
  }

  const token = createAdminSessionToken(walletAddress);
  if (!token) {
    return NextResponse.json({ error: "Admin session could not be created." }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookie.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: adminSessionCookie.maxAge,
  });
  return response;
}

export async function DELETE(req: NextRequest) {
  if (!hasValidAdminOrigin(req) || !getAdminSessionWallet(req)) {
    return NextResponse.json({ error: "Unauthorized admin session." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(adminSessionCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: 0,
  });
  return response;
}
