"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { NftCard, AgentCardData } from "@/components/NftCard";
import { Shield, Sparkles, Filter, Lock, Disc3 } from "lucide-react";
import Link from "next/link";

export default function MyNftsPage() {
  const { isConnected, address } = useAccount();

  const [rarityFilter, setRarityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Sample collection
  const [agents, setAgents] = useState<AgentCardData[]>([
    {
      tokenId: 1,
      name: "Agent Legend #1",
      rarity: "Epic",
      className: "Phantom Operative",
      cybernetics: "Quantum Neural Link v4",
      weapon: "Railgun AR-99",
      powerRating: 92,
      clearance: "Level 4 - Top Secret",
      isStaked: false,
    },
    {
      tokenId: 2,
      name: "Agent Legend #2",
      rarity: "Rare",
      className: "Cipher Netrunner",
      cybernetics: "Thermal HUD Visor",
      weapon: "Photon Disruptor",
      powerRating: 84,
      clearance: "Level 3 - Secret",
      isStaked: false,
    },
    {
      tokenId: 3,
      name: "Agent Legend #3",
      rarity: "Legendary",
      className: "Apex Commander",
      cybernetics: "Plasma Core Reactor",
      weapon: "Plasma Scythe",
      powerRating: 97,
      clearance: "Level 5 - Black Ops",
      isStaked: true,
      isLocked: true,
      remainingSeconds: 3600 * 48,
    },
    {
      tokenId: 4,
      name: "Agent Legend #4",
      rarity: "Common",
      className: "Vanguard Enforcer",
      cybernetics: "Nanite Bio-Armor",
      weapon: "Heavy Blasters",
      powerRating: 78,
      clearance: "Level 2 - Confidential",
      isStaked: true,
      isLocked: false,
      remainingSeconds: 0,
    },
  ]);

  const filteredAgents = agents.filter((agent) => {
    if (rarityFilter !== "ALL" && agent.rarity !== rarityFilter) return false;
    if (statusFilter === "STAKED" && !agent.isStaked) return false;
    if (statusFilter === "UNSTAKED" && agent.isStaked) return false;
    return true;
  });

  const handleQuickStake = (id: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.tokenId === id ? { ...a, isStaked: true, isLocked: true, remainingSeconds: 72 * 3600 } : a))
    );
  };

  const handleQuickUnstake = (id: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.tokenId === id ? { ...a, isStaked: false, isLocked: false, remainingSeconds: 0 } : a))
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>OPERATIVE INVENTORY</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider font-mono">
            My Agent Legends
          </h1>
          <p className="text-xs text-slate-400">
            Inspect your cybernetic squad, manage 72-hour staking vault custody, and track spin yield.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/mint"
            className="px-5 py-2.5 rounded-xl bg-[#00FF66] hover:bg-[#00CC52] text-[#07090E] font-bold font-mono text-xs flex items-center space-x-2 shadow-neon-green"
          >
            <Sparkles className="w-4 h-4 text-[#07090E]" />
            <span>Recruit More</span>
          </Link>
          <Link
            href="/staking"
            className="px-5 py-2.5 rounded-xl bg-[#9D4EDD]/20 hover:bg-[#9D4EDD]/30 text-[#C77DFF] border border-[#9D4EDD]/40 font-bold font-mono text-xs flex items-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>Staking Vault</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          {["ALL", "UNSTAKED", "STAKED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                statusFilter === st
                  ? "bg-[#00FF66] text-[#07090E] shadow-neon-green"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Rarity Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "Common", "Rare", "Epic", "Legendary", "Mythic"].map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                rarityFilter === r
                  ? "bg-[#00E5FF] text-[#07090E] shadow-neon-blue"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {!isConnected ? (
        <div className="glass-panel p-16 rounded-3xl text-center space-y-4">
          <Shield className="w-12 h-12 text-[#00FF66] mx-auto animate-pulse" />
          <h3 className="text-xl font-bold font-mono text-white">Wallet Not Connected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Connect your Web3 wallet on BNB Smart Chain to view and command your Agent Legends operatives.
          </p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl text-center space-y-4">
          <Shield className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold font-mono text-white">No Operatives Match This Filter</h3>
          <p className="text-xs text-slate-400">Try adjusting your status or rarity filters above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAgents.map((agent) => (
            <NftCard
              key={agent.tokenId}
              agent={agent}
              onStake={handleQuickStake}
              onUnstake={handleQuickUnstake}
            />
          ))}
        </div>
      )}
    </div>
  );
}

