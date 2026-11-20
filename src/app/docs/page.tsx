"use client";

import React from "react";
import { StatsHeader } from "@/components/StatsHeader";
import { PageIntro } from "@/components/PageIntro";
import { FileText, Shield, Users, Award, Code2, Bot, Sparkles, Zap, ShieldCheck } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <StatsHeader />

      <PageIntro
        eyebrow="Documentation"
        title="Protocol guide"
        description="Learn about the 2,000 supply cap, 1 Free Agent Wallet mint, 0.0005 BNB paid mints, and AI Agent prompts."
        icon={FileText}
      />

      <div className="space-y-8 text-xs font-mono">
        {/* 1. Platform Overview */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Code2 className="w-5 h-5 text-[#00FF66]" />
            <span>1. Platform Overview</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Agent Legends is a dedicated Web3 AI agent collection on BNB Smart Chain. The protocol establishes an exclusive 2,000 operative cap with dual recruitment mechanisms: free on-chain minting for verified Agentic Wallets and accessible paid minting for community collectors.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li><strong className="text-white">Network:</strong> BNB Smart Chain (Chain ID: 56).</li>
            <li><strong className="text-white">NFT Contract:</strong> <code className="text-sky-300">0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912</code></li>
            <li><strong className="text-white">Total Supply:</strong> 2,000 NFTs (strictly capped on-chain).</li>
            <li><strong className="text-white">Max Per Wallet:</strong> 10 NFTs total.</li>
          </ul>
        </section>

        {/* 2. Agentic Wallet Free Mint */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <span>2. Agentic Wallet Free Mint</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Holders of a Binance Agent ID (Registry: <code className="text-sky-300">0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F</code>) automatically qualify for <strong className="text-[#00FF66]">1 Free NFT Mint</strong>.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
            <code>claimFreeNFT() — 0 BNB + gas</code>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li><strong className="text-white">Reserve Allocation:</strong> Exactly 1,000 free NFTs are reserved in the contract for Agent ID holders.</li>
            <li><strong className="text-white">Limit:</strong> Exactly 1 free claim per eligible wallet address.</li>
            <li><strong className="text-white">Eligibility Check:</strong> Verified instantly on-chain via <code>isAgenticWalletUser(address)</code>.</li>
          </ul>
        </section>

        {/* 3. Paid Mint Protocol */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Zap className="w-5 h-5 text-violet-400" />
            <span>3. Paid Mint Protocol</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            All collectors and agentic wallets can mint operatives via the paid mint function at a fixed price of <strong className="text-violet-300">0.0005 BNB per NFT</strong>.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
            <code>mintPaid(uint256 quantity) — value: quantity * 0.0005 BNB</code>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li><strong className="text-white">Price:</strong> 0.0005 BNB (500,000,000,000,000 wei) per NFT.</li>
            <li><strong className="text-white">Quantity Limit:</strong> Up to 9 paid mints per wallet (or bounded by remaining allowance, max 10 total per wallet).</li>
            <li><strong className="text-white">Supply Protection:</strong> Contract enforces that paid mints cannot exceed remaining supply or intrude into unminted free agent reserves.</li>
          </ul>
        </section>

        {/* 4. Community Referrals */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Users className="w-5 h-5 text-[#00E5FF]" />
            <span>4. Community Recruitment & Syndicate Links</span>
          </div>
          <div className="space-y-2 text-slate-300">
            <p>• Every connected wallet receives a personalized referral URL: <code>https://agentlegends.xyz/?ref=0x...</code></p>
            <p>• Share your link with fellow agents, DAOs, and AI syndicates to build your squad.</p>
            <p>• Top referrers and minters are honored on the official protocol Leaderboard.</p>
          </div>
        </section>

        {/* 5. Agentic Wallet & AI Prompts */}
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-800/60 bg-slate-900/40 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-base uppercase">
            <Bot className="w-5 h-5 text-sky-400" />
            <span>5. Agentic Wallet & AI Agent Protocol Prompts</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Agent Legends is built for direct interaction via AI Agent wallets (Brian AI, Coinbase AgentKit, GOAT SDK, ElizaOS). You can issue natural language prompts to your agent to execute on-chain functions:
          </p>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300">
              <span className="text-slate-400 block text-[11px] uppercase mb-1">Free Agent Claim Prompt</span>
              &ldquo;Check if my wallet has a Binance Agent ID on BNB Chain (56), then call claimFreeNFT() on contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912 to claim 1 free Agent Legend.&rdquo;
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300">
              <span className="text-slate-400 block text-[11px] uppercase mb-1">Paid Mint Prompt</span>
              &ldquo;Mint [1-9] Agent Legend NFTs on BNB Smart Chain (Chain ID: 56) with contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912 using function mintPaid(quantity) sending 0.0005 BNB per NFT.&rdquo;
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300">
              <span className="text-slate-400 block text-[11px] uppercase mb-1">Official Communications</span>
              &ldquo;Follow official protocol releases at https://x.com/agent_legends on X (Twitter).&rdquo;
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
