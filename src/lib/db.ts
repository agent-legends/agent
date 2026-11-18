import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const log: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

let cachedD1Client: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (cachedD1Client) {
    return cachedD1Client;
  }

  try {
    const cf = getCloudflareContext();
    if (cf?.env && (cf.env as any).DB) {
      const adapter = new PrismaD1((cf.env as any).DB);
      cachedD1Client = new PrismaClient({ adapter, log });
      return cachedD1Client;
    }
  } catch {
    // Outside of request context or during build
  }

  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = new PrismaClient({ log });
  }
  return globalThis.prismaGlobal;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

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
