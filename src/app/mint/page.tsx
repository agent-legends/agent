import React, { Suspense } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Shield, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { AgenticTerminal } from "@/components/AgenticTerminal";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";

const AGENT_PROMPT = `Interact with the Agent Legends NFT contract on BNB Smart Chain (Chain ID: 56) at address 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912 (or visit https://agent.agentlegends.workers.dev/):
1. Call \`isAgenticWalletUser(myAddress)\` and \`hasClaimedFree(myAddress)\` to check if my wallet is eligible for the 1 free NFT reserved for Binance Agent ID (.ai) holders.
2. Check \`remainingWalletAllowance(myAddress)\` and \`totalSupply()\`.
3. If I am eligible and haven't claimed my free NFT yet, execute \`claimFreeNFT()\` (0 BNB + gas).
4. Otherwise, tell me how many paid NFTs I can still mint (at 0.0005 BNB each, up to 10 total per wallet) and ask for my confirmation before calling \`mintPaid(quantity)\`.`;

export default function MintPage() {
  return (
    <div className="space-y-10 w-full">
      {/* Intro Header */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-950/80 font-mono space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AGENT LEGENDS · NFT RECRUITMENT</span>
          </div>

          <div className="text-xs text-slate-400">
            Total Supply: <strong className="text-white">2,000 Capped</strong> · Network: <strong className="text-sky-300">BNB Mainnet (56)</strong>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Recruit Your Agent Legend
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
            1 Free Mint reserved for verified Binance SPACE ID Agent ID (<code className="text-emerald-300">.ai</code>) holders via <code className="text-slate-300">claimFreeNFT()</code>.
            Public paid mints available at <strong className="text-violet-300">0.0005 BNB</strong> each (up to 10 total per wallet).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block">1 Free Agent ID Mint</span>
            <p className="text-slate-400 text-[11px]">1,000 free NFTs reserved for SPACE ID .ai holders.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-violet-400 font-bold block">0.0005 BNB Paid Mint</span>
            <p className="text-slate-400 text-[11px]">Open to all Web3 wallets. Max 10 total per wallet.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-amber-400 font-bold block">15% Referral Boost</span>
            <p className="text-slate-400 text-[11px]">Holding 1+ NFT unlocks 15% USDT referral commission on share mints.</p>
          </div>
        </div>
      </section>

      {/* Copyable AI Prompt Box */}
      <AgenticPromptBox
        title="Copy Prompt for Your AI Agent Wallet"
        action="Autonomous Mint"
        prompt={AGENT_PROMPT}
        contractAddress="0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912"
      />

      {/* Terminal with Default Tab set to NFTS */}
      <Suspense
        fallback={
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center font-mono text-slate-400 text-xs">
            Loading NFT Mint Portal...
          </div>
        }
      >
        <AgenticTerminal defaultTab="NFTS" />
      </Suspense>
    </div>
  );
}
