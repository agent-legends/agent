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

  export async function getOrCreateUser(walletAddress: string, referrer?: string) {
    const normalized = walletAddress.toLowerCase();
    return prisma.user.upsert({
      where: { walletAddress: normalized },
      create: {
        walletAddress: normalized,
        referrerAddress: referrer ? referrer.toLowerCase() : null,
      },
      update: {},
    });
  }
