"use client";

import React, { Suspense } from "react";
import { MintSection } from "@/components/MintSection";
import { StatsHeader } from "@/components/StatsHeader";
import { Shield, Sparkles, CheckCircle2 } from "lucide-react";

export default function MintPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CYBERNETIC OPERATIVES DISPATCH</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider font-mono">
          Mint Agent Legends 2.0
        </h1>
        <p className="text-xs text-slate-400">
          Enforced 10,000 maximum collection cap. Each agent minted immediately unlocks 72-hour staking eligibility and spin credits.
        </p>
      </div>

      <Suspense fallback={<div className="text-center font-mono text-xs text-slate-400 py-10">Loading recruitment interface...</div>}>
        <MintSection />
      </Suspense>

      {/* Minting Perks & Contract Security */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Chainlink Oracle Pricing
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mint price is locked at $0.20 USD equivalent in BNB. Real-time Chainlink feed prevents price exploitation and checks for staleness.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Immediate Staking Yield
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every newly recruited agent generates exactly one spin credit on its first stake in the 72-hour contract vault.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 flex items-center justify-center text-[#C77DFF]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Permanent Attribution
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your referral attribution is locked forever upon your referee&apos;s first successful mint. 3 referred wallets unlock 1 free NFT.
          </p>
        </div>
      </div>
    </div>
  );
}

