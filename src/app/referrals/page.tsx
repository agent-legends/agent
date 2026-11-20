import React, { Suspense } from "react";
import { AgenticTerminal } from "@/components/AgenticTerminal";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";
import { Trophy, Gift, Crown, Shield, Users } from "lucide-react";

export default function ReferralsPage() {
  return (
    <div className="space-y-10 w-full font-mono">
      {/* Referral Header */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#00FF66]/30 bg-slate-950/80 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <Trophy className="w-3.5 h-3.5" />
          <span>ON-CHAIN REFERRAL SYNDICATE</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Syndicate Referrals & Rewards
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            Share your unique referral link to earn instant USDT payouts directly on BNB Smart Chain. Referees receive an instant <strong className="text-emerald-400">5% USDT cashback</strong> on every share minted!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block">5% Instant Buyer Cashback</span>
            <p className="text-slate-400 text-[11px]">Your referees automatically receive 5% USDT cashback on their mint cost.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-white font-bold block">10% Standard Commission</span>
            <p className="text-slate-400 text-[11px]">Paid out immediately in USDT to your wallet for each share minted.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30 space-y-1">
            <span className="text-amber-300 font-bold block">👑 15% NFT-Boosted Commission</span>
            <p className="text-slate-400 text-[11px]">Holding 1+ Agent Legend NFT boosts your commission rate to 15%.</p>
          </div>
        </div>
      </section>

      {/* Terminal with Shares Tab showing the Referral Dashboard */}
      <Suspense
        fallback={
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center font-mono text-slate-400 text-xs">
            Loading Referral Terminal...
          </div>
        }
      >
        <AgenticTerminal defaultTab="SHARES" />
      </Suspense>
    </div>
  );
}
