"use client";

import React from "react";
import { ReferralSection } from "@/components/ReferralSection";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";
import { Users, Gift, Crown, Shield } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="Invite your community"
        title="Referrals and rewards"
        description="Share your referral link. Every three successfully referred wallets unlock one free NFT, with cumulative milestones."
        icon={Users}
      />

      <ReferralSection />

      <div className="max-w-4xl mx-auto">
        <AgenticPromptBox
          title="Agentic Wallet Referral Prompt"
          action="Referral & Rewards"
          prompt="Generate and copy Agent Legends referral link with wallet address for BNB Chain (Chain ID: 56). 3 referred mints unlock 1 free bonus Agent Legend NFT."
          contractAddress="0x3d8b78084BF69936AF661DD33C6F95f345E93702"
        />
      </div>
    </div>
  );
}

