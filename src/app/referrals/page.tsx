"use client";

import React from "react";
import { ReferralSection } from "@/components/ReferralSection";
import { StatsHeader } from "@/components/StatsHeader";
import { Users, Gift, Crown, Shield } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-bold tracking-wider">
          <Users className="w-3.5 h-3.5" />
          <span>SYNDICATE ALLIANCE REWARDS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider font-mono">
          Referral Protocol
        </h1>
        <p className="text-xs text-slate-400">
          Share your syndicate link. Every 3 successful referred wallets unlocks 1 free Agent Legends NFT. Milestones are cumulative.
        </p>
      </div>

      <ReferralSection />
    </div>
  );
}

