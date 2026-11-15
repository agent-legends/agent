import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPoolGlobal: Pool | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const log: Prisma.LogLevel[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (!connectionString) {
    return new PrismaClient({ log });
  }

  const pool =
    process.env.NODE_ENV === "production"
      ? new Pool({ connectionString, max: 1 })
      : (globalThis.prismaPoolGlobal ??= new Pool({ connectionString }));

  return new PrismaClient({
    adapter: new PrismaPg(pool, { schema: "public" }),
    log,
  });
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

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
