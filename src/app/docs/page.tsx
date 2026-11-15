"use client";

import React from "react";
import { StatsHeader } from "@/components/StatsHeader";
import { PageIntro } from "@/components/PageIntro";
import { FileText, Shield, Lock, Disc3, Users, Award, CheckCircle2, AlertTriangle, Code2 } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <StatsHeader />

      <PageIntro
        eyebrow="Documentation"
        title="Protocol guide"
        description="Understand the collection, smart contract rules, spin probabilities, referral milestones, and payout verification."
        icon={FileText}
      />

      <div className="space-y-8 text-xs font-mono">
        {/* 1. Protocol Architecture */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Code2 className="w-5 h-5 text-[#00FF66]" />
            <span>1. System Architecture & Technology Stack</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Agent Legends 2.0 targets BNB Smart Chain with a hybrid on-chain / off-chain design. Contracts and services must be independently reviewed and configured before production use.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li><strong className="text-white">Smart Contracts:</strong> Solidity 0.8.24 with OpenZeppelin Contracts 5.x (ERC721Enumerable, Ownable2Step, Pausable, ReentrancyGuard).</li>
            <li><strong className="text-white">Price Feed Oracle:</strong> Chainlink BNB/USD Aggregator with strict price validation and 3-hour staleness checks.</li>
            <li><strong className="text-white">Staking Custody:</strong> Safe ERC-721 custody with an immutable 72-hour lock timer per staked NFT.</li>
            <li><strong className="text-white">Randomness Engine:</strong> Server-side cryptographically secure random number generation. Outcomes are centralized and cannot be independently verified as VRF results.</li>
            <li><strong className="text-white">Frontend Web3:</strong> Next.js 15 App Router, Wagmi v2, Viem 2.x, RainbowKit, Tailwind CSS, Framer Motion.</li>
          </ul>
        </section>

        {/* 2. NFT Minting & Chainlink Oracle */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Shield className="w-5 h-5 text-[#00E5FF]" />
            <span>2. NFT Minting & Dynamic Pricing</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            The collection has a fixed maximum supply of <strong className="text-[#00FF66]">10,000 NFTs</strong>. The mint price is fixed in USD at <strong className="text-[#00FF66]">$0.20 USD</strong> and dynamically converted to BNB:
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
            <code>bnbRequiredWei = (0.20 * 10^8 * 10^18) / bnbPriceFromOracle</code>
          </div>
          <p className="text-slate-400">
            Excess BNB sent by users is automatically refunded in the same transaction. The contract strictly reverts if price feed answers are stale, negative, or unverified.
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
              • <strong className="text-white">Single Initial Spin Rule:</strong> Every NFT generates exactly 1 initial spin credit on its first successful stake (tracked via <code>hasGeneratedInitialSpin[tokenId]</code>). Restaking an already-staked NFT will <strong className="text-amber-300">never duplicate an initial spin credit</strong>.
            </p>
            <p>
              • <strong className="text-white">Credit Preservation:</strong> Unstaking an operative does not burn or deduct unused spin credits.
            </p>
          </div>
        </section>

        {/* 4. Spin & Earn Reward Distribution */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Disc3 className="w-5 h-5 text-[#00FF66]" />
            <span>4. Spin & Earn Probability Distribution</span>
          </div>
          <p className="text-slate-300">
            Outcomes are resolved using Node.js <code>crypto.randomInt(0, 10000)</code> across 10,000 basis points:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="p-3">Reward Outcome</th>
                  <th className="p-3">Probability</th>
                  <th className="p-3">Roll Range (out of 10,000)</th>
                  <th className="p-3">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                <tr>
                  <td className="p-3 text-white font-bold">$0.10 USDT</td>
                  <td className="p-3 text-[#00FF66]">80%</td>
                  <td className="p-3 text-slate-400">0 – 7,999</td>
                  <td className="p-3 text-amber-300">Manual Admin Payout</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.20 USDT</td>
                  <td className="p-3 text-[#00E5FF]">10%</td>
                  <td className="p-3 text-slate-400">8,000 – 8,999</td>
                  <td className="p-3 text-amber-300">Manual Admin Payout</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.50 USDT</td>
                  <td className="p-3 text-purple-400">1%</td>
                  <td className="p-3 text-slate-400">9,000 – 9,099</td>
                  <td className="p-3 text-amber-300">Manual Admin Payout</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$0.70 USDT</td>
                  <td className="p-3 text-pink-400">1%</td>
                  <td className="p-3 text-slate-400">9,100 – 9,199</td>
                  <td className="p-3 text-amber-300">Manual Admin Payout</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">$1.00 USDT</td>
                  <td className="p-3 text-amber-400">1%</td>
                  <td className="p-3 text-slate-400">9,200 – 9,299</td>
                  <td className="p-3 text-amber-300">Manual Admin Payout</td>
                </tr>
                <tr>
                  <td className="p-3 text-white font-bold">1 Free Spin</td>
                  <td className="p-3 text-blue-400">2%</td>
                  <td className="p-3 text-slate-400">9,300 – 9,499</td>
                  <td className="p-3 text-emerald-400">Instant Credit (+1 Spin)</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-bold">Try Your Luck</td>
                  <td className="p-3 text-slate-500">5%</td>
                  <td className="p-3 text-slate-400">9,500 – 9,999</td>
                  <td className="p-3 text-slate-500">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Manual USDT Payout Workflow */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Award className="w-5 h-5 text-amber-400" />
            <span>5. Manual USDT Payout & On-Chain Verification Pipeline</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            All winning outcomes are processed under strict manual oversight to ensure solvency and prevent algorithmic exploitation:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-slate-400">
            <li>User spins and server saves outcome as <code>PENDING</code>.</li>
            <li>Reward appears in the private wallet-authorized admin dashboard.</li>
            <li>Admin transfers USDT using the official BSC USDT contract.</li>
            <li>Admin submits the resulting transaction hash into the payout verification engine.</li>
            <li>Backend queries BNB Smart Chain RPC, verifies receipt status, confirms transfer event amount and recipient, and marks reward as <code>PAID</code>.</li>
          </ol>
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
