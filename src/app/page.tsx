"use client";

import React from "react";
import Link from "next/link";
import { StatsHeader } from "@/components/StatsHeader";
import { Sparkles, Shield, Disc3, Lock, Users, Award, ChevronRight, Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Real-time Platform Statistics */}
      <StatsHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-12 lg:p-16 border border-[#00FF66]/30 shadow-neon-green">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00FF66]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#9D4EDD]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
              <span>GENESIS PROTOCOL ACTIVE • BNB SMART CHAIN</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight font-mono text-white leading-tight">
              AGENT LEGENDS <span className="text-[#00FF66]">2.0</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Recruit elite cyberpunk tactical operatives on BNB Smart Chain. Mint for{" "}
              <strong className="text-[#00FF66]">$0.20 USD in BNB</strong>, lock into our 72-hour staking vault to generate spin credits, and win daily verified USDT bounties.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/mint"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-[#07090E] font-black font-mono tracking-wider uppercase text-sm hover:scale-105 transition-all shadow-neon-green flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-[#07090E]" />
                <span>MINT NOW ($0.20)</span>
              </Link>

              <Link
                href="/spin"
                className="px-8 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-[#00E5FF] border border-[#00E5FF]/40 font-black font-mono tracking-wider uppercase text-sm transition-all hover:scale-105 shadow-neon-blue flex items-center space-x-2"
              >
                <Disc3 className="w-4 h-4 text-[#00E5FF]" />
                <span>SPIN & EARN WHEEL</span>
              </Link>

              <Link
                href="/staking"
                className="px-6 py-4 rounded-2xl bg-[#9D4EDD]/15 hover:bg-[#9D4EDD]/25 text-[#C77DFF] border border-[#9D4EDD]/40 font-bold font-mono tracking-wider uppercase text-sm transition-all flex items-center space-x-2"
              >
                <Lock className="w-4 h-4 text-[#C77DFF]" />
                <span>STAKING (72H)</span>
              </Link>
            </div>

            {/* Quick Micro-stats */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">COLLECTION CAP</span>
                <span className="text-white font-bold text-sm">10,000 Total</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CHAINLINK ORACLE</span>
                <span className="text-[#00FF66] font-bold text-sm">BNB / USD Feed</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">REFERRAL REWARD</span>
                <span className="text-[#00E5FF] font-bold text-sm">3 = 1 Free NFT</span>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic Featured Agent Preview */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl p-[2px] bg-gradient-to-b from-[#00FF66] via-[#00E5FF] to-[#9D4EDD] shadow-neon-green animate-float">
              <div className="bg-[#0A0E17] rounded-[22px] p-6 space-y-5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[#00FF66] font-bold">
                    OPERATIVE #0001
                  </span>
                  <span className="text-purple-400 font-bold uppercase tracking-widest">
                    ★ MYTHIC APEX
                  </span>
                </div>

                <div className="aspect-square rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-black border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="absolute inset-0 cyber-scanline opacity-30" />
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#00FF66]/20 to-[#00E5FF]/20 border border-[#00FF66]/50 flex items-center justify-center shadow-neon-green">
                    <Shield className="w-12 h-12 text-[#00FF66] animate-pulse-slow" />
                  </div>
                  <div className="text-sm font-black text-white font-mono uppercase tracking-wider">
                    Apex Commander
                  </div>
                  <div className="text-[11px] font-mono text-[#00E5FF]">
                    Quantum Neural Link v4 • Railgun AR-99
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Power Rating:</span>
                    <span className="text-amber-400 font-bold">99 / 100</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Staking Spin Yield:</span>
                    <span className="text-[#00FF66] font-bold">1 Initial Spin</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Staking Duration:</span>
                    <span className="text-purple-300 font-bold">72-Hour Custody</span>
                  </div>
                </div>

                <Link
                  href="/mint"
                  className="w-full py-3 rounded-xl bg-[#00FF66] text-[#07090E] font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 hover:bg-[#00CC52] transition-colors shadow-neon-green"
                >
                  <span>Mint Operatives Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-bold tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>OPERATIONAL TIMELINE</span>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider font-mono">
            How Agent Legends Works
          </h2>
          <p className="text-xs text-slate-400">
            A sustainable, verifiable Web3 model combining Chainlink pricing, 72-hour staking custody, and audited manual USDT distributions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-[#00FF66]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              Mint for $0.20 BNB
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mint up to 20 operatives per transaction. Price is converted dynamically via verified Chainlink BNB/USD oracle with staleness checks.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-[#9D4EDD]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 flex items-center justify-center text-[#C77DFF] font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              72h Staking Lock
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stake your NFTs in our secure contract. Every NFT generates exactly 1 initial spin on first stake. Restaking never duplicates initial spins.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-[#00E5FF]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              Spin & Earn Wheel
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spin with your credits. 80% $0.10 USDT, 10% $0.20 USDT, 1% $0.50, 1% $0.70, 1% $1.00, 2% Free Spin, and 5% Try Again via CSPRNG.
            </p>
          </div>

          {/* Step 4 */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-amber-400/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              Verified USDT Payouts
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admins manually dispatch USDT rewards and submit transaction hashes. Backend strictly verifies transfers on BNB Chain before marking Paid.
            </p>
          </div>

          {/* Step 5 */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3 relative group hover:border-[#00FF66]/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] font-mono font-bold text-sm">
              05
            </div>
            <h3 className="text-sm font-bold font-mono text-white uppercase">
              3 Referrals = 1 Free NFT
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every 3 referred wallets that mint an NFT unlocks 1 free Agent Legends NFT. Milestones are cumulative (3=1, 6=2, 9=3, 12=4...).
            </p>
          </div>
        </div>
      </section>

      {/* Feature Split Banner */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4 hover:border-[#00FF66]/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66]">
            <Disc3 className="w-6 h-6 animate-spin" style={{ animationDuration: "10s" }} />
          </div>
          <h3 className="text-xl font-bold font-mono text-white uppercase">
            Spin-to-Earn Bounty Wheel
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every spin credit gives you a roll on the prize wheel with real USDT payouts. Outcomes are determined on the backend with Node.js cryptographic randomness (CSPRNG) and tracked in an immutable audit ledger.
          </p>
          <Link
            href="/spin"
            className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-[#00FF66] hover:underline pt-2"
          >
            <span>Launch Prize Wheel</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-4 hover:border-[#00E5FF]/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold font-mono text-white uppercase">
            Syndicate Referral Alliance
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate your permanent referral URL. Once your referred contacts mint their first operative, you earn cumulative credit towards free NFT milestones. Free referral NFTs count toward the 10,000 collection cap.
          </p>
          <Link
            href="/referrals"
            className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-[#00E5FF] hover:underline pt-2"
          >
            <span>Access Referral Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

