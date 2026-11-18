"use client";

import React from "react";
import { SpinWheel } from "@/components/SpinWheel";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";
import { Disc3, Award } from "lucide-react";

export default function SpinPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="Spin rewards"
        title="Use your spin credits"
        description="Use credits earned from staking, view your spin results, and track payout status."
        icon={Disc3}
      />

      <SpinWheel />

      <div className="max-w-4xl mx-auto">
        <AgenticPromptBox
          title="Agentic Wallet Spin Prompt"
          action="Spin & Earn"
          prompt="Check available spin balance on Agent Legends (https://agent.agentlegends.workers.dev) for connected wallet and execute spin to receive cryptographic reward or USDT prize."
          contractAddress="Agent Legends Protocol API"
          network="BNB Smart Chain (56) + D1"
        />
      </div>

      {/* Reward status overview */}
      <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Reward status</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[#00FF66] font-bold">1. Spin Completed</span>
            <p className="text-[11px] text-slate-400">Your result appears when the spin finishes.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-amber-300 font-bold">2. Reward Listed</span>
            <p className="text-[11px] text-slate-400">USDT prizes appear in your Rewards history.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[#00E5FF] font-bold">3. Transfer Pending</span>
            <p className="text-[11px] text-slate-400">Follow the payout status from your Rewards page.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold">4. Confirmed</span>
            <p className="text-[11px] text-slate-400">The status updates after the BNB Smart Chain transfer is confirmed.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

