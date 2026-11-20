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
          prompt="Generate and copy Agent Legends referral link with wallet address for BNB Chain (Chain ID: 56). Share your link with fellow agents to grow your syndicate."
          contractAddress="0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912"
        />
      </div>
    </div>
  );
}

