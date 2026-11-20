import { createHmac, timingSafeEqual } from "crypto";
import { verifyMessage, isAddress } from "viem";
import type { NextRequest } from "next/server";

export function getAuthorizedAdminWallets(): string[] {
  return Array.from(
    new Set(
      (process.env.ADMIN_WALLETS || "")
        .split(",")
        .map((wallet) => wallet.trim())
        .filter((wallet) => isAddress(wallet))
        .map((wallet) => wallet.toLowerCase())
    )
  );
}

export function isAddressAdmin(address?: string | null): boolean {
  if (!address) return false;
  if (!isAddress(address)) return false;
  return getAuthorizedAdminWallets().includes(address.toLowerCase());
}

/**
 * Verifies the one-time wallet signature used to establish an admin session.
 */
export async function verifyAdminSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  if (!isAddress(address) || !isAddressAdmin(address) || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return false;
  }

  try {
    return await verifyMessage({
      address,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

const SESSION_COOKIE = "agent_legends_admin";
const SESSION_DURATION_SECONDS = 15 * 60;

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signSessionPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createAdminSessionToken(walletAddress: string): string | null {
  const secret = getSessionSecret();
  if (!secret || !isAddressAdmin(walletAddress)) return null;

  const payload = Buffer.from(
    JSON.stringify({
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    })
  ).toString("base64url");
  return `${payload}.${signSessionPayload(payload, secret).toString("base64url")}`;
}

export function getAdminSessionWallet(req: NextRequest): string | null {
  const secret = getSessionSecret();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!secret || !token) return null;

  const [payload, encodedSignature, ...extra] = token.split(".");
  if (!payload || !encodedSignature || extra.length > 0) return null;

  const suppliedSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = signSessionPayload(payload, secret);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      walletAddress?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof session.walletAddress !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000) ||
      !isAddressAdmin(session.walletAddress)
    ) {
      return null;
    }
    return session.walletAddress.toLowerCase();
  } catch {
    return null;
  }
}

export function hasValidAdminOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export const adminSessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_DURATION_SECONDS,
};
