"use client";

import React, { Suspense } from "react";
import { MintSection } from "@/components/MintSection";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";
import { Sparkles, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function MintPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="The collection"
        title="Mint your Agent Legend"
        description="Total collection supply is strictly capped at 2,000 NFTs. 1 Free Mint for verified Agentic Wallets; Paid mints up to 9 per wallet at 0.0005 BNB each."
        icon={Sparkles}
      />

      <Suspense fallback={<div className="text-center font-mono text-xs text-slate-400 py-10">Loading recruitment interface...</div>}>
        <MintSection />
      </Suspense>

      <div className="max-w-4xl mx-auto">
        <AgenticPromptBox
          title="Agentic Wallet Mint Prompt"
          action="Free & Paid Mint"
          prompt="Recruit Agent Legend NFT on BNB Smart Chain (Chain ID: 56) with contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912. If holding Binance Agent ID, call claimFreeNFT() for 1 free mint. Otherwise call mintPaid(quantity) with 0.0005 BNB per NFT (up to 9 paid mints)."
          contractAddress="0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912"
        />
      </div>

      {/* Minting Perks & Contract Security */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            1 Free Agent Mint
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            1,000 free NFTs are reserved on-chain for verified Binance Agent ID holders via <code className="text-slate-300">claimFreeNFT()</code>.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            0.0005 BNB Paid Mint
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mint up to 9 paid NFTs per wallet via <code className="text-slate-300">mintPaid(quantity)</code> at an accessible 0.0005 BNB per operative.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            2,000 Hard Supply Cap
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The on-chain smart contract enforces an absolute ceiling of 2,000 Agent Legends. No additional tokens can ever be minted.
          </p>
        </div>
      </div>
    </div>
  );
}
