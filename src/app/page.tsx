import React, { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  ExternalLink,
  Flame,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { AgenticTerminal } from "@/components/AgenticTerminal";
import { AgenticPromptBox } from "@/components/AgenticPromptBox";

const AGENT_PROMPT = `Interact with Agent Legends on BNB Smart Chain (Chain ID: 56):
1. For Shares: Call calculateMintCost(quantity) on LegendsShareMint 0x0E918a36bEcAF6dF057bf206C5642D50045BBF35, approve USDT 0x55d398326f99059fF775485246999027B3197955, and execute buyShares(quantity, referrer, maxUSDTIn) with 1% slippage buffer.
2. For NFTs: Call isAgenticWalletUser(myAddress) on NFT contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912. If eligible and not claimed, call claimFreeNFT() (0 BNB). Otherwise, call mintPaid(quantity) at 0.0005 BNB/NFT up to 10 per wallet.`;

export default function HomePage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-4 sm:py-6">
      {/* Hero Banner Header */}
      <section className="glass-panel p-6 sm:p-10 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-slate-950 shadow-2xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/70 border border-sky-500/30 text-sky-400 text-xs font-mono font-bold tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>BNB SMART CHAIN · MAINNET (CHAIN ID: 56)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-mono leading-tight">
              AGENT LEGENDS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-violet-400">
                MINT & SHARE TERMINAL
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-mono">
              The unified Web3 agent terminal inspired by <span className="text-white font-bold">jager.live</span>.
              Mint <span className="text-violet-300 font-bold">$LEGENDS</span> shares on the bonding curve with automatic PancakeSwap LP launch,
              or recruit <span className="text-emerald-300 font-bold">SPACE ID Agent ID (.ai)</span> NFTs.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a
                href="https://x.com/agent_legends"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-mono text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow @agent_legends</span>
              </a>

              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-400 border border-sky-500/30 font-mono text-xs font-bold transition-colors flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                <span>AI Agent Guide (/llms.txt)</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              <Link
                href="/docs"
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono text-xs font-bold transition-colors"
              >
                Protocol Docs
              </Link>
            </div>
          </div>

          {/* Quick Stat Pill Widget */}
          <div className="w-full lg:w-auto p-5 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono text-xs space-y-3 min-w-[280px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block border-b border-slate-800/80 pb-2">
              Protocol Highlights
            </span>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Curve Shares:</span>
              <span className="text-white font-bold">100,000 Cap ($0.50+)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Pancake LP Launch:</span>
              <span className="text-violet-300 font-bold">At 10,000 Shares</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Referral Cashback:</span>
              <span className="text-emerald-400 font-bold">5% Instant USDT</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Referral Commission:</span>
              <span className="text-amber-300 font-bold">10% / 15% (NFT Boost)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Agent ID (.ai) Mint:</span>
              <span className="text-[#00FF66] font-bold">1 FREE per Wallet</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Paid NFT Mint:</span>
              <span className="text-cyan-300 font-bold">0.0005 BNB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Copyable AI Prompt Box */}
      <AgenticPromptBox
        title="Copy Prompt for Binance AI Pro / OpenClaw / Claude"
        action="Autonomous Mint & Buy"
        prompt={AGENT_PROMPT}
        contractAddress="0x0E918a36bEcAF6dF057bf206C5642D50045BBF35"
      />

      {/* Main Agentic Mint & Share Terminal */}
      <Suspense
        fallback={
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center font-mono text-slate-400 text-xs">
            Connecting to BNB Smart Chain Terminal...
          </div>
        }
      >
        <AgenticTerminal defaultTab="SHARES" />
      </Suspense>
    </div>
  );
}
