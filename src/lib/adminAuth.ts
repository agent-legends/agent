import { verifyMessage } from "viem";

// Configured admin addresses (normalized to lowercase)
const DEFAULT_ADMIN_WALLETS = [
  "0x89d22fbeddb1a8c61e4796b07de2592518ee4f32",
  "0x53d8330cfde0e633d62325e67a8ff17f7300c3b8",
];

export function getAuthorizedAdminWallets(): string[] {
  const envWallets = process.env.ADMIN_WALLETS
    ? process.env.ADMIN_WALLETS.split(",").map((w) => w.trim().toLowerCase())
    : [];
  return Array.from(new Set([...DEFAULT_ADMIN_WALLETS, ...envWallets]));
}

export function isAddressAdmin(address?: string | null): boolean {
  if (!address) return false;
  const admins = getAuthorizedAdminWallets();
  return admins.includes(address.toLowerCase());
}

/**
 * Verifies that a signed message originates from an authorized admin wallet
 */
export async function verifyAdminSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    if (!isAddressAdmin(address)) {
      return false;
    }

    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    return isValid;
  } catch (err) {
    console.error("Admin signature verification failed:", err);
    return false;
  }
}

