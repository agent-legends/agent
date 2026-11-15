"use client";

import React from "react";
import { ReferralSection } from "@/components/ReferralSection";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
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
    </div>
  );
}

