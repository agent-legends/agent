import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, type Log } from "viem";
import { bsc } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

// bsc-dataseed.binance.org rejects eth_getLogs ("Request exceeds defined limit"),
// so the activity feed uses getLogs-capable public RPCs with fallbacks.
const LOG_RPCS = [
  process.env.BSC_LOGS_RPC_URL,
  "https://bsc-rpc.publicnode.com",
  "https://bsc.publicnode.com",
].filter(Boolean) as string[];

const CHUNK = 50_000n; // max range accepted by publicnode
const CHUNKS = 4; // ~200k blocks of history
const CACHE_MS = 15_000;

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

let cache: { at: number; data: ActivityPayload } | null = null;

async function scan(rpc: string): Promise<ActivityPayload> {
  const client = createPublicClient({ chain: bsc, transport: http(rpc, { timeout: 12_000 }) });
  const cfg = CONTRACT_ADDRESSES[56];
  const latest = await client.getBlockNumber();

  const ranges: Array<[bigint, bigint]> = [];
  for (let i = 0; i < CHUNKS; i++) {
    const to = latest - CHUNK * BigInt(i);
    const from = to - CHUNK + 1n;
    if (to <= 0n) break;
    ranges.push([from > 0n ? from : 0n, to]);
  }

  const results = await Promise.all(
    ranges.map(([fromBlock, toBlock]) =>
      Promise.all([
        client.getLogs({ address: cfg.shareMint, events: [SHARES_MINTED, REFERRAL_PAID], fromBlock, toBlock }),
        client.getLogs({ address: cfg.nft, event: TRANSFER, args: { from: ZERO }, fromBlock, toBlock }),
      ])
    )
  );

  const shareLogs: Log[] = [];
  const nftLogs: Log[] = [];
  for (const [s, n] of results) {
    shareLogs.push(...(s as Log[]));
    nftLogs.push(...(n as Log[]));
  }

  const activities: ActivityEntry[] = [];
  const minters = new Map<string, number>();
  const buyers = new Map<string, { shares: number; usdt: number }>();
  const refs = new Map<string, { count: number; usdt: number }>();
  let shareMints = 0;
  let referrals = 0;

  for (const raw of shareLogs) {
    const log = raw as Log & { eventName?: string; args?: Record<string, unknown> };
    const a = log.args || {};
    if (log.eventName === "SharesMinted") {
      shareMints++;
      const buyer = String(a.buyer).toLowerCase();
      const shares = Number(a.sharesAmount ?? 0n);
      const usdt = Number(a.totalCost ?? 0n) / 1e18;
      const b = buyers.get(buyer) || { shares: 0, usdt: 0 };
      buyers.set(buyer, { shares: b.shares + shares, usdt: b.usdt + usdt });
      activities.push({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: "SHARES",
        account: buyer,
        detail: `Minted ${shares} share${shares === 1 ? "" : "s"} for $${usdt.toFixed(2)} USDT`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
      });
    } else if (log.eventName === "ReferralPaid") {
      referrals++;
      const referrer = String(a.referrer).toLowerCase();
      const usdt = Number(a.commissionAmount ?? 0n) / 1e18;
      const r = refs.get(referrer) || { count: 0, usdt: 0 };
      refs.set(referrer, { count: r.count + 1, usdt: r.usdt + usdt });
      activities.push({
        id: `${log.transactionHash}-${log.logIndex}`,
        type: "REFERRAL",
        account: referrer,
        detail: `Earned $${usdt.toFixed(2)} USDT referral commission`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
      });
    }
  }

  // Group NFT mints per transaction so a 5-NFT mint shows as one row.
  const nftByTx = new Map<string, { to: string; ids: bigint[]; block: number; logIndex: number }>();
  for (const raw of nftLogs) {
    const log = raw as Log & { args?: { to?: string; tokenId?: bigint } };
    const to = String(log.args?.to).toLowerCase();
    const tx = log.transactionHash!;
    const entry = nftByTx.get(tx) || { to, ids: [], block: Number(log.blockNumber), logIndex: log.logIndex ?? 0 };
    entry.ids.push(log.args?.tokenId ?? 0n);
    nftByTx.set(tx, entry);
    minters.set(to, (minters.get(to) || 0) + 1);
  }
  for (const [tx, e] of nftByTx) {
    const ids = e.ids.map((id) => `#${id.toString()}`);
    activities.push({
      id: `${tx}-${e.logIndex}`,
      type: "NFT",
      account: e.to,
      detail: `Minted ${e.ids.length} Agent Legend NFT${e.ids.length === 1 ? "" : "s"} (${ids.slice(0, 3).join(", ")}${ids.length > 3 ? "…" : ""})`,
      txHash: tx,
      blockNumber: e.block,
    });
  }

  activities.sort((x, y) => y.blockNumber - x.blockNumber);

  const top = <T,>(m: Map<string, T>, score: (v: T) => number, fmt: (v: T) => string): RankRow[] =>
    [...m.entries()]
      .sort((a, b) => score(b[1]) - score(a[1]))
      .slice(0, 20)
      .map(([wallet, v]) => ({ wallet, value: score(v), secondary: fmt(v) }));

  return {
    activities: activities.slice(0, 25),
    leaderboard: {
      nftMinters: top(minters, (v) => v, (v) => `${v} NFT${v === 1 ? "" : "s"} minted`),
      shareBuyers: top(buyers, (v) => v.shares, (v) => `${v.shares} shares · $${v.usdt.toFixed(2)} USDT`),
      referrers: top(refs, (v) => v.count, (v) => `${v.count} invites · $${v.usdt.toFixed(2)} USDT earned`),
    },
    totals: { nftMints: nftLogs.length, shareMints, referrals },
    latestBlock: Number(latest),
    fromBlock: Number(ranges[ranges.length - 1]?.[0] ?? latest),
    rpc: new URL(rpc).host,
    updatedAt: Date.now(),
  };
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.data, { headers: { "Cache-Control": "public, s-maxage=15" } });
  }

  let lastError: unknown = null;
  for (const rpc of LOG_RPCS) {
    try {
      const data = await scan(rpc);
      cache = { at: Date.now(), data };
      return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=15" } });
    } catch (err) {
      lastError = err;
      console.warn(`/api/activity: RPC ${rpc} failed`, err);
    }
  }

  if (cache) {
    return NextResponse.json({ ...cache.data, stale: true });
  }
  return NextResponse.json(
    { error: "On-chain activity is temporarily unavailable.", detail: String(lastError).slice(0, 200) },
    { status: 503 }
  );
}
