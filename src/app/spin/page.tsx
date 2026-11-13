"use client";

import React from "react";
import { SpinWheel } from "@/components/SpinWheel";
import { StatsHeader } from "@/components/StatsHeader";
import { Disc3, ShieldAlert, Award, Clock } from "lucide-react";

export default function SpinPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider">
          <Disc3 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "6s" }} />
          <span>TACTICAL BOUNTY PRIZE WHEEL</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider font-mono">
          Spin & Earn USDT
        </h1>
        <p className="text-xs text-slate-400">
          Roll the prize wheel using spin credits earned from staking. Win real USDT bounties and bonus free spins.
        </p>
      </div>

      <SpinWheel />

      {/* Manual Payout Process Infographic */}
      <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Manual USDT Payout & On-Chain Verification Lifecycle</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[#00FF66] font-bold">1. Spin Completed</span>
            <p className="text-[11px] text-slate-400">Winning roll is resolved via CSPRNG and recorded in the audit database.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-amber-300 font-bold">2. Admin Queue</span>
            <p className="text-[11px] text-slate-400">Winning wallet appears in the admin payout dashboard as Pending.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[#00E5FF] font-bold">3. USDT Transfer</span>
            <p className="text-[11px] text-slate-400">Admin dispatches official BSC USDT to the winner and submits transaction hash.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold">4. Verified Paid</span>
            <p className="text-[11px] text-slate-400">Backend strictly verifies the BSC receipt and status updates to Paid.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

