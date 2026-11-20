import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, type Log } from "viem";
import { bsc } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import snapshot from "@/config/activitySnapshot.json";

export const dynamic = "force-dynamic";

const LOG_RPC = "https://bsc-rpc.publicnode.com";
const ZERO = "0x0000000000000000000000000000000000000000";

const SHARES_MINTED = parseAbiItem(
  "event SharesMinted(address indexed buyer, address indexed referrer, uint256 sharesAmount, uint256 totalCost, uint256 newTotalShares)"
);
const REFERRAL_PAID = parseAbiItem(
  "event ReferralPaid(address indexed referrer, address indexed referee, uint256 commissionAmount, uint256 cashbackAmount)"
);
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

export interface ActivityEntry {
  id: string;
  type: "SHARES" | "REFERRAL" | "NFT";
  account: string;
  detail: string;
  txHash: string;
  blockNumber: number;
}

interface RankRow {
  wallet: string;
  value: number;
  secondary: string;
}

interface ActivityPayload {
  activities: ActivityEntry[];
  leaderboard: {
    nftMinters: RankRow[];
    shareBuyers: RankRow[];
    referrers: RankRow[];
  };
  totals: { nftMints: number; shareMints: number; referrals: number };
  latestBlock: number;
  fromBlock: number;
  rpc: string;
  updatedAt: number;
}

// In-memory cache for live worker instances
let liveCache: { at: number; data: ActivityPayload } | null = null;

async function getLiveActivity(): Promise<ActivityPayload> {
  const baseData = snapshot as unknown as ActivityPayload;
  const cfg = CONTRACT_ADDRESSES[56];
  const client = createPublicClient({
    chain: bsc,
    transport: http(LOG_RPC, { timeout: 4000 }),
  });

  try {
    const latest = await client.getBlockNumber();
    const fromBlock = BigInt(baseData.latestBlock || 134737959);

    // If new blocks have elapsed since snapshot, check for any new events
    if (latest > fromBlock) {
      // Limit scan window to at most 10,000 blocks for ultra-fast response
      const scanFrom = latest - fromBlock > 10000n ? latest - 10000n : fromBlock + 1n;

      const [shareLogs, referralLogs, nftLogs] = await Promise.all([
        client.getLogs({
          address: cfg.shareMint,
          event: SHARES_MINTED,
          fromBlock: scanFrom,
          toBlock: latest,
        }),
        client.getLogs({
          address: cfg.shareMint,
          event: REFERRAL_PAID,
          fromBlock: scanFrom,
          toBlock: latest,
        }),
        client.getLogs({
          address: cfg.nft,
          event: TRANSFER,
          args: { from: ZERO },
          fromBlock: scanFrom,
          toBlock: latest,
        }),
      ]);

      const newActivities: ActivityEntry[] = [];

      for (const raw of shareLogs) {
        const log = raw as Log & { args?: { buyer?: string; sharesAmount?: bigint; totalCost?: bigint } };
        const buyer = String(log.args?.buyer || "");
        const shares = Number(log.args?.sharesAmount ?? 0n);
        const usdt = Number(log.args?.totalCost ?? 0n) / 1e18;
        newActivities.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "SHARES",
          account: buyer,
          detail: `Minted ${shares} Share${shares === 1 ? "" : "s"} for $${usdt.toFixed(2)} USDT`,
          txHash: log.transactionHash!,
          blockNumber: Number(log.blockNumber),
        });
      }

      for (const raw of referralLogs) {
        const log = raw as Log & { args?: { referrer?: string; commissionAmount?: bigint } };
        const referrer = String(log.args?.referrer || "");
        const usdt = Number(log.args?.commissionAmount ?? 0n) / 1e18;
        newActivities.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "REFERRAL",
          account: referrer,
          detail: `Earned $${usdt.toFixed(2)} USDT referral commission`,
          txHash: log.transactionHash!,
          blockNumber: Number(log.blockNumber),
        });
      }

      const nftByTx = new Map<string, { to: string; ids: bigint[]; block: number; logIndex: number }>();
      for (const raw of nftLogs) {
        const log = raw as Log & { args?: { to?: string; tokenId?: bigint } };
        const to = String(log.args?.to || "");
        const tx = log.transactionHash!;
        const entry = nftByTx.get(tx) || { to, ids: [], block: Number(log.blockNumber), logIndex: log.logIndex ?? 0 };
        entry.ids.push(log.args?.tokenId ?? 0n);
        nftByTx.set(tx, entry);
      }

      for (const [tx, e] of nftByTx) {
        const ids = e.ids.map((id) => `#${id.toString()}`);
        newActivities.push({
          id: `${tx}-${e.logIndex}`,
          type: "NFT",
          account: e.to,
          detail: `Recruited ${e.ids.length} Agent Legend${e.ids.length === 1 ? "" : "s"} (${ids.slice(0, 3).join(", ")}${ids.length > 3 ? "…" : ""})`,
          txHash: tx,
          blockNumber: e.block,
        });
      }

      // Merge new activities on top of snapshot activities, avoiding duplicate IDs
      const existingIds = new Set(baseData.activities.map((a) => a.id));
      const freshOnly = newActivities.filter((a) => !existingIds.has(a.id));
      const combined = [...freshOnly, ...baseData.activities].slice(0, 50);

      return {
        activities: combined,
        leaderboard: baseData.leaderboard,
        totals: {
          nftMints: baseData.totals.nftMints + nftLogs.length,
          shareMints: baseData.totals.shareMints + shareLogs.length,
          referrals: baseData.totals.referrals + referralLogs.length,
        },
        latestBlock: Number(latest),
        fromBlock: Number(scanFrom),
        rpc: "bsc-rpc.publicnode.com",
        updatedAt: Date.now(),
      };
    }
  } catch (err) {
    console.warn("Live scan failed, falling back to base snapshot:", err);
  }

  return {
    ...baseData,
    updatedAt: Date.now(),
    rpc: "bsc-rpc.publicnode.com",
  };
}

export async function GET() {
  if (liveCache && Date.now() - liveCache.at < 10000) {
    return NextResponse.json(liveCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    });
  }

  const data = await getLiveActivity();
  liveCache = { at: Date.now(), data };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
    },
  });
}
