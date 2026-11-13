"use client";

import React from "react";
import { StakingSection } from "@/components/StakingSection";
import { StatsHeader } from "@/components/StatsHeader";
import { Lock, Shield, Sparkles, Clock, AlertTriangle } from "lucide-react";

export default function StakingPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#9D4EDD]/15 border border-[#9D4EDD]/30 text-[#C77DFF] text-xs font-mono font-bold tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>72-HOUR CUSTODY PROTOCOL</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider font-mono">
          Agent Legends Staking
        </h1>
        <p className="text-xs text-slate-400">
          Stake your operatives in our immutable smart contract vault. Earn spin credits to play the prize wheel.
        </p>
      </div>

      <StakingSection />

      {/* Security & Lock Parameters */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#9D4EDD]/20 border border-[#9D4EDD]/40 flex items-center justify-center text-[#C77DFF]">
            <Clock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Mandatory 72h Duration
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Operatives are locked for exactly 72 hours from the moment of staking. Smart contract strictly forbids unstaking before the 72-hour timer elapses.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF66]/20 border border-[#00FF66]/40 flex items-center justify-center text-[#00FF66]">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Single Initial Spin Rule
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every NFT generates exactly one initial spin credit upon its first stake. Restaking an already-staked NFT will not grant another initial spin credit.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF]">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Spin Credit Preservation
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Unused spin credits are preserved in your account even if you unstake your operatives. Free spin rewards are added independently.
          </p>
        </div>
      </div>
    </div>
  );
}

