"use client";

import React from "react";
import { StatsHeader } from "@/components/StatsHeader";
import { PageIntro } from "@/components/PageIntro";
import { FileText, Shield, Lock, Disc3, Users, Award, Code2 } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <StatsHeader />

      <PageIntro
        eyebrow="Documentation"
        title="Protocol guide"
        description="Learn about the collection, staking, spin credits, referrals, and reward tracking."
        icon={FileText}
      />

      <div className="space-y-8 text-xs font-mono">
        {/* 1. Protocol Architecture */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Code2 className="w-5 h-5 text-[#00FF66]" />
            <span>1. Platform Overview</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
              Agent Legends is a BNB Smart Chain collection with NFT minting, staking, spin credits, community referrals, and reward tracking.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong className="text-white">Network:</strong> BNB Smart Chain.</li>
              <li><strong className="text-white">Staking:</strong> A 72-hour minimum lock applies to staked NFTs.</li>
              <li><strong className="text-white">Rewards:</strong> Spin results and payout updates are available in your account.</li>
          </ul>
        </section>

        {/* 2. NFT Minting & Platform Fee */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Shield className="w-5 h-5 text-[#00E5FF]" />
          <span>2. NFT Minting & Platform Fee</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
          The NFT mint itself is <strong className="text-[#00FF66]">free</strong>. The contract provides an on-chain BNB quote for the platform fee: <strong className="text-[#00FF66]">$0.10 per NFT</strong>. Blockchain gas is charged separately.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
          <code>feeWei = quotePlatformFee(quantity)</code>
          </div>
          <p className="text-slate-400">
          The interface reads the current quote and collection supply directly from the deployed contract. It does not treat the platform fee as an NFT purchase price.
          </p>
        </section>

        {/* 3. 72-Hour Staking & Initial Spin Rule */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Lock className="w-5 h-5 text-[#9D4EDD]" />
            <span>3. 72-Hour Staking & Initial Spin Entitlement</span>
          </div>
          <div className="space-y-2 text-slate-300 leading-relaxed">
            <p>
              • <strong className="text-white">Minimum Staking Duration:</strong> Staked NFTs are held in custody for a mandatory minimum of 72 hours. Early unstaking attempts revert with <code>StakingLocked()</code>.
            </p>
            <p>
              • <strong className="text-white">Single Initial Spin Rule:</strong> Every NFT grants one spin credit on its first successful stake. Restaking that NFT does not grant another initial credit.
            </p>
            <p>
              • <strong className="text-white">Credit Preservation:</strong> Unstaking an operative does not burn or deduct unused spin credits.
            </p>
          </div>
        </section>

        {/* 4. Spin & Earn Rewards */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Disc3 className="w-5 h-5 text-[#00FF66]" />
            <span>4. Spin & Earn Rewards</span>
          </div>
          <p className="text-slate-300">
            The server uses a cryptographically secure random number generator for spin outcomes. Results are not on-chain VRF randomness. The wheel includes USDT prizes, an extra spin credit, and a try-again outcome. View your result and payout status on the Spin and Rewards pages.
          </p>
          <p className="text-slate-400">
            Initial credits are synchronized from confirmed staking events. Spin spending and free-spin awards are tracked in the application database; the contract&apos;s <code>spinCredits</code> value reflects on-chain grants, not the remaining app balance.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-3">Reward Outcome</th>
                  <th className="p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                <tr>
                  <td className="p-3 text-white font-bold">$0.10 USDT</td>
                  <td className="p-3 text-slate-300">USDT prize</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.20 USDT</td>
                  <td className="p-3 text-slate-300">USDT prize</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.50 USDT</td>
                  <td className="p-3 text-slate-300">USDT prize</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.70 USDT</td>
                  <td className="p-3 text-slate-300">USDT prize</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$1.00 USDT</td>
                  <td className="p-3 text-slate-300">USDT prize</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">1 Free Spin</td>
                  <td className="p-3 text-emerald-400">Adds one spin credit</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-bold">Try Your Luck</td>
                  <td className="p-3 text-slate-500">No prize on this spin</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. USDT Reward Status */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Award className="w-5 h-5 text-amber-400" />
            <span>5. USDT Reward Status</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            USDT prizes appear in your Rewards history. Payout status updates after the corresponding BNB Smart Chain transfer is confirmed.
          </p>
        </section>

        {/* 6. Referral Protocol */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Users className="w-5 h-5 text-[#00E5FF]" />
            <span>6. Referral Milestone Protocol</span>
          </div>
          <div className="space-y-2 text-slate-300">
            <p>• Every wallet receives a permanent referral link: <code>https://agentlegends.xyz/?ref=0x...</code></p>
            <p>• <strong className="text-[#00FF66]">Every 3 successful referred wallets = 1 free NFT</strong> (3=1, 6=2, 9=3, 12=4...).</p>
            <p>• A referral counts only after the referee successfully mints at least one NFT.</p>
            <p>• Free referral NFTs count toward the 10,000 maximum collection supply.</p>
            <p>• Self-referrals are prohibited at the smart contract level.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
