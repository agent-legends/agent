import crypto from "crypto";

export type SpinOutcome =
  | "USD_0_10"
  | "USD_0_20"
  | "USD_0_50"
  | "USD_0_70"
  | "USD_1_00"
  | "FREE_SPIN"
  | "TRY_YOUR_LUCK";

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
export const SPIN_REWARDS: SpinRewardConfig[] = [
  {
    outcome: "USD_0_10",
    label: "$0.10 USDT",
    usdtAmount: 0.10,
    isFreeSpin: false,
    minRoll: 0,
    maxRoll: 7999,
    bps: 8000,
  },
  {
    outcome: "USD_0_20",
    label: "$0.20 USDT",
    usdtAmount: 0.20,
    isFreeSpin: false,
    minRoll: 8000,
    maxRoll: 8999,
    bps: 1000,
  },
  {
    outcome: "USD_0_50",
    label: "$0.50 USDT",
    usdtAmount: 0.50,
    isFreeSpin: false,
    minRoll: 9000,
    maxRoll: 9099,
    bps: 100,
  },
  {
    outcome: "USD_0_70",
    label: "$0.70 USDT",
    usdtAmount: 0.70,
    isFreeSpin: false,
    minRoll: 9100,
    maxRoll: 9199,
    bps: 100,
  },
  {
    outcome: "USD_1_00",
    label: "$1.00 USDT",
    usdtAmount: 1.00,
    isFreeSpin: false,
    minRoll: 9200,
    maxRoll: 9299,
    bps: 100,
  },
  {
    outcome: "FREE_SPIN",
    label: "1 Free Spin",
    usdtAmount: 0.00,
    isFreeSpin: true,
    minRoll: 9300,
    maxRoll: 9499,
    bps: 200,
  },
  {
    outcome: "TRY_YOUR_LUCK",
    label: "Try Your Luck",
    usdtAmount: 0.00,
    isFreeSpin: false,
    minRoll: 9500,
    maxRoll: 9999,
    bps: 500,
  },
];

export interface SpinResult {
  spinId: string;
  walletAddress: string;
  outcome: SpinOutcome;
  label: string;
  rewardAmountUsdt: number;
  isFreeSpinAwarded: boolean;
  randomNumber: number;
  randomSeed: string;
  isWinner: boolean;
  timestamp: string;
  requiresPayout: boolean;
}

/**
 * Generate a cryptographically secure random spin result
 * Uses Node.js crypto.randomInt(0, 10000) - NEVER Math.random()
 */
export function executeSecureBackendSpin(walletAddress: string): SpinResult {
  // Generate random roll between 0 and 9999 inclusive using CSPRNG
  const randomNumber = crypto.randomInt(0, 10000);
  const randomSeed = crypto.randomBytes(32).toString("hex");

  // Determine reward config
  const matched = SPIN_REWARDS.find(
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
    randomSeed,
    isWinner,
    timestamp,
    requiresPayout: isWinner,
  };
}

