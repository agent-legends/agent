"use client";

import React, { Suspense } from "react";
import { MintSection } from "@/components/MintSection";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";
import { Sparkles, CheckCircle2 } from "lucide-react";

export default function MintPage() {
  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="The collection"
        title="Mint your Agent Legend"
        description="The NFT mint is free. Pay the live on-chain quote for a $0.10 platform fee per NFT in BNB, plus blockchain gas."
        icon={Sparkles}
      />

      <Suspense fallback={<div className="text-center font-mono text-xs text-slate-400 py-10">Loading recruitment interface...</div>}>
        <MintSection />
      </Suspense>

      <div className="max-w-4xl mx-auto">
        <AgenticPromptBox
          title="Agentic Wallet Mint Prompt"
          action="Free Mint"
          prompt="Mint 1 Agent Legend NFT on BNB Smart Chain (Chain ID: 56) by calling contract 0x3d8b78084BF69936AF661DD33C6F95f345E93702 function mint(1) with the quoted platform fee."
          contractAddress="0x3d8b78084BF69936AF661DD33C6F95f345E93702"
        />
      </div>

      {/* Minting Perks & Contract Security */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            Live platform-fee quote
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The deployed NFT contract quotes the BNB platform fee on-chain. The NFT itself has no purchase price; gas is separate.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-mono font-bold text-white uppercase">
            One-Time Spin Credit
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

