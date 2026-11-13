"use client";

import React, { useState } from "react";
import { Shield, Lock, Unlock, Zap, Eye } from "lucide-react";

export interface AgentCardData {
  tokenId: number;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";
  className: string;
  cybernetics: string;
  weapon: string;
  powerRating: number;
  clearance: string;
  isStaked: boolean;
  isLocked?: boolean;
  remainingSeconds?: number;
}

export function NftCard({
  agent,
  onStake,
  onUnstake,
}: {
  agent: AgentCardData;
  onStake?: (id: number) => void;
  onUnstake?: (id: number) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case "Mythic":
        return "border-[#FF007F] shadow-[0_0_20px_rgba(255,0,127,0.4)] text-[#FF007F]";
      case "Legendary":
        return "border-[#FFB703] shadow-[0_0_20px_rgba(255,183,3,0.4)] text-[#FFB703]";
      case "Epic":
        return "border-[#9D4EDD] shadow-[0_0_20px_rgba(157,78,221,0.4)] text-[#C77DFF]";
      case "Rare":
        return "border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.4)] text-[#00E5FF]";
      default:
        return "border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.3)] text-[#00FF66]";
    }
  };

  const rarityStyle = getRarityGlow(agent.rarity);

  return (
    <div className={`relative group rounded-3xl p-[2px] transition-all duration-300 hover:scale-[1.03] ${rarityStyle.split(" ")[0]} ${rarityStyle.split(" ")[1]}`}>
      <div className="bg-[#0A0E17] rounded-[22px] overflow-hidden p-4 space-y-4 relative flex flex-col justify-between h-full">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase font-black px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 tracking-wider text-slate-300">
            AGENT #{agent.tokenId}
          </span>
          <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${rarityStyle.split(" ")[2]}`}>
            ★ {agent.rarity}
          </span>
        </div>

        {/* Tactical Hologram Card Visual */}
        <div className="relative aspect-square rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-slate-800 flex items-center justify-center overflow-hidden group-hover:border-slate-700">
          {/* Cyber Scanline effect */}
          <div className="absolute inset-0 cyber-scanline opacity-30 pointer-events-none" />

          {/* Hologram Avatar Graphic */}
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#00FF66]/20 via-[#00E5FF]/20 to-[#9D4EDD]/20 border border-slate-700 flex items-center justify-center shadow-neon-green">
              <Shield className="w-10 h-10 text-[#00FF66] animate-pulse-slow" />
            </div>
            <div className="text-xs font-bold font-mono text-white mt-1">
              {agent.className}
            </div>
            <div className="flex items-center space-x-1 text-[11px] font-mono text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>PWR: {agent.powerRating}</span>
            </div>
          </div>

          {/* Staked Status Watermark */}
          {agent.isStaked && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-500/40 text-[9px] font-mono text-purple-300 font-bold flex items-center space-x-1">
              <Lock className="w-2.5 h-2.5" />
              <span>{agent.isLocked ? "72H LOCKED" : "UNLOCKED"}</span>
            </div>
          )}
        </div>

        {/* Agent Details */}
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Cybernetics:</span>
            <span className="text-slate-200 truncate max-w-[140px] text-right">{agent.cybernetics}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Weapon:</span>
            <span className="text-slate-200 truncate max-w-[140px] text-right">{agent.weapon}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Clearance:</span>
            <span className="text-[#00E5FF] truncate max-w-[140px] text-right">{agent.clearance}</span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {agent.isStaked ? (
            <button
              onClick={() => onUnstake && onUnstake(agent.tokenId)}
              disabled={agent.isLocked}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                agent.isLocked
                  ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                  : "bg-[#9D4EDD] text-white hover:bg-[#7B2CBF] shadow-neon-purple cursor-pointer"
              }`}
            >
              {agent.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{agent.isLocked ? "Locked (72h)" : "Unstake Agent"}</span>
            </button>
          ) : (
            <button
              onClick={() => onStake && onStake(agent.tokenId)}
              className="w-full py-2.5 rounded-xl bg-[#00FF66]/15 hover:bg-[#00FF66] text-[#00FF66] hover:text-[#07090E] border border-[#00FF66]/40 font-mono text-xs font-bold transition-all shadow-neon-green flex items-center justify-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Stake (+1 Spin)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

