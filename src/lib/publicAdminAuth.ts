import { isAddress } from "viem";

export function isPublicAdminWallet(address?: string | null): boolean {
  if (!address || !isAddress(address)) return false;
  const wallets = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || "")
    .split(",")
    .map((wallet) => wallet.trim().toLowerCase());
  return wallets.includes(address.toLowerCase());
}
