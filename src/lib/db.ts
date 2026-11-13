import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// In-Memory Fallback Store (ensures full platform interactivity even before PostgreSQL is configured)
interface MemoryStore {
  users: Map<string, any>;
  spins: any[];
  payouts: any[];
  auditLogs: any[];
}

export const memoryStore: MemoryStore = {
  users: new Map(),
  spins: [],
  payouts: [],
  auditLogs: [],
};

export async function getOrCreateUser(walletAddress: string, referrer?: string) {
  const normalized = walletAddress.toLowerCase();
  try {
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalized },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: normalized,
          referrerAddress: referrer ? referrer.toLowerCase() : null,
          availableSpins: 0,
        },
      });
    }
    return user;
  } catch {
    // In-memory fallback
    if (!memoryStore.users.has(normalized)) {
      memoryStore.users.set(normalized, {
        walletAddress: normalized,
        referrerAddress: referrer ? referrer.toLowerCase() : null,
        totalMints: 0,
        totalStaked: 0,
        availableSpins: 2, // grant starter credits for test preview if fresh
        totalSpins: 0,
        successfulReferrals: 0,
        referredNftCount: 0,
        claimedFreeNfts: 0,
        unclaimedFreeNfts: 0,
        totalRewardsWonUsdt: 0,
        pendingPayoutUsdt: 0,
        paidPayoutUsdt: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return memoryStore.users.get(normalized);
  }
}

