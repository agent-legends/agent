import { expect } from "chai";
import { createRequire } from "node:module";
import { register } from "ts-node";

register({
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "Node",
  },
});

const require = createRequire(import.meta.url);
const {
  executeSecureBackendSpin,
  SPIN_REWARDS,
  buildSpinRewards,
  validateRewardDistribution,
  DEFAULT_REWARD_CONFIG,
} = require("../src/lib/spinEngine.ts");

describe("Backend spin engine", function () {
  it("defines a continuous 10,000-point reward distribution", function () {
    let nextRoll = 0;
    for (const reward of SPIN_REWARDS) {
      expect(reward.minRoll).to.equal(nextRoll);
      expect(reward.maxRoll - reward.minRoll + 1).to.equal(reward.bps);
      nextRoll = reward.maxRoll + 1;
    }
    expect(nextRoll).to.equal(10_000);
    expect(SPIN_REWARDS.reduce((sum, reward) => sum + reward.bps, 0)).to.equal(10_000);
  });

  it("returns a backend-generated result matching its recorded probability tier", function () {
    const result = executeSecureBackendSpin("0xAbCdEf0000000000000000000000000000000000");
    const reward = SPIN_REWARDS.find((entry) => entry.outcome === result.outcome);

    expect(result.randomNumber).to.be.within(0, 9_999);
    if (!reward) throw new Error("Spin result did not match a configured reward.");
    expect(result.randomNumber).to.be.within(reward.minRoll, reward.maxRoll);
    expect(result.walletAddress).to.equal("0xabcdef0000000000000000000000000000000000");
    expect(result.spinId).to.be.a("string").and.not.empty;
  });

  it("keeps pre-milestone and post-milestone distributions at exactly 100%", function () {
    expect(validateRewardDistribution(DEFAULT_REWARD_CONFIG, false)).to.equal(true);
    expect(validateRewardDistribution(DEFAULT_REWARD_CONFIG, true)).to.equal(true);
  });

  it("locks high-value tiers before 1,000 and unlocks them at 1,000", function () {
    const pre = buildSpinRewards(false);
    const post = buildSpinRewards(true);
    expect(pre.find((tier: any) => tier.outcome === "USD_1_00")).to.equal(undefined);
    expect(post.find((tier: any) => tier.outcome === "USD_1_00")?.bps).to.equal(200);
  });
});
