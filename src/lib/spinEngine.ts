import crypto from "crypto";

export type SpinOutcome =
  | "USD_0_05"
  | "USD_0_10"
  | "TRY_NEXT_TIME"
  | "USD_0_40"
  | "USD_0_50"
  | "USD_0_60"
  | "USD_0_70"
  | "USD_1_00";

export interface SpinRewardConfig {
  outcome: SpinOutcome;
  label: string;
  usdtAmount: number;
  isFreeSpin: boolean;
  minRoll: number;
  maxRoll: number; // inclusive
  bps: number; // basis points (out of 10,000)
}

/**
 * Exact Probability Distribution (Total = 10,000 bps / 100%):
 * - $0.10 USDT: 80% (0 .. 7999)
 * - $0.20 USDT: 10% (8000 .. 8999)
 * - $0.50 USDT: 1%  (9000 .. 9099)
 * - $0.70 USDT: 1%  (9100 .. 9199)
 * - $1.00 USDT: 1%  (9200 .. 9299)
 * - One free spin: 2% (9300 .. 9499)
 * - Try your luck: 5% (9500 .. 9999)
 */
export const DEFAULT_REWARD_CONFIG: Array<{
  outcome: SpinOutcome;
  label: string;
  rewardAmountUsdt: number;
  preMilestoneBps: number;
  postMilestoneBps: number;
}> = [
  { outcome: "TRY_NEXT_TIME", label: "Try Next Time", rewardAmountUsdt: 0, preMilestoneBps: 2800, postMilestoneBps: 2000 },
  { outcome: "USD_0_05", label: "$0.05 USDT", rewardAmountUsdt: 0.05, preMilestoneBps: 4000, postMilestoneBps: 4000 },
  { outcome: "USD_0_10", label: "$0.10 USDT", rewardAmountUsdt: 0.10, preMilestoneBps: 3000, postMilestoneBps: 3000 },
  { outcome: "USD_0_40", label: "$0.40 USDT", rewardAmountUsdt: 0.40, preMilestoneBps: 200, postMilestoneBps: 200 },
  { outcome: "USD_0_50", label: "$0.50 USDT", rewardAmountUsdt: 0.50, preMilestoneBps: 0, postMilestoneBps: 200 },
  { outcome: "USD_0_60", label: "$0.60 USDT", rewardAmountUsdt: 0.60, preMilestoneBps: 0, postMilestoneBps: 200 },
  { outcome: "USD_0_70", label: "$0.70 USDT", rewardAmountUsdt: 0.70, preMilestoneBps: 0, postMilestoneBps: 200 },
  { outcome: "USD_1_00", label: "$1.00 USDT", rewardAmountUsdt: 1.00, preMilestoneBps: 0, postMilestoneBps: 200 },
];

export const SPIN_REWARDS: SpinRewardConfig[] = buildSpinRewards(false);

export function buildSpinRewards(
  milestoneReached: boolean,
  configured = DEFAULT_REWARD_CONFIG
): SpinRewardConfig[] {
  const active = configured.filter((tier) => milestoneReached ? true : tier.outcome !== "USD_0_50" && tier.outcome !== "USD_0_60" && tier.outcome !== "USD_0_70" && tier.outcome !== "USD_1_00");
  let nextRoll = 0;
  return active.map((tier) => {
    const bps = milestoneReached ? tier.postMilestoneBps : tier.preMilestoneBps;
    const config: SpinRewardConfig = {
      outcome: tier.outcome,
      label: tier.label,
      usdtAmount: tier.rewardAmountUsdt,
      isFreeSpin: false,
      minRoll: nextRoll,
      maxRoll: nextRoll + bps - 1,
      bps,
    };
    nextRoll += bps;
    return config;
  }).filter((tier) => tier.bps > 0);
}

export function validateRewardDistribution(
  tiers: Array<{ preMilestoneBps: number; postMilestoneBps: number }>,
  milestoneReached: boolean
): boolean {
  const sum = tiers.reduce(
    (total, tier) => total + (milestoneReached ? tier.postMilestoneBps : tier.preMilestoneBps),
    0
  );
  return sum === 10_000;
}

export interface SpinResult {
  spinId: string;
  walletAddress: string;
  outcome: SpinOutcome;
  label: string;
  rewardAmountUsdt: number;
  isFreeSpinAwarded: boolean;
  randomNumber: number;
  isWinner: boolean;
  timestamp: string;
  requiresPayout: boolean;
}

/**
 * Generate a cryptographically secure random spin result
 * Uses Node.js crypto.randomInt(0, 10000) - NEVER Math.random()
 */
export function executeSecureBackendSpin(
  walletAddress: string,
  milestoneReached = false,
  configured = DEFAULT_REWARD_CONFIG
): SpinResult {
  // Generate random roll between 0 and 9999 inclusive using CSPRNG
  const randomNumber = crypto.randomInt(0, 10000);

  // Determine reward config
  const rewards = buildSpinRewards(milestoneReached, configured);
  const matched = rewards.find(
    (tier) => randomNumber >= tier.minRoll && randomNumber <= tier.maxRoll
  );

  if (!matched) {
    throw new Error(`Invalid roll resolution: ${randomNumber}`);
  }

  const timestamp = new Date().toISOString();
  const spinId = `SPIN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const isWinner = matched.usdtAmount > 0;

  return {
    spinId,
    walletAddress: walletAddress.toLowerCase(),
    outcome: matched.outcome,
    label: matched.label,
    rewardAmountUsdt: matched.usdtAmount,
    isFreeSpinAwarded: matched.isFreeSpin,
    randomNumber,
    isWinner,
    timestamp,
    requiresPayout: isWinner,
  };
}
