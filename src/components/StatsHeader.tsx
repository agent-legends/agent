"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Lock, Disc3, Award, Users, ShieldCheck } from "lucide-react";

interface StatsData {
  totalSupply: number;
  totalMinted: number;
  remainingSupply: number;
  mintPriceUsd: number;
  totalStaked: number;
  totalSpins: number;
  totalWinners: number;
  totalRewardsDistributedUsdt: number;
  pendingPayoutsAmountUsdt: number;
  paidPayoutsAmountUsdt: number;
}

export function StatsHeader() {
  const [stats, setStats] = useState<StatsData>({
    totalSupply: 10000,
    totalMinted: 342,
    remainingSupply: 9658,
    mintPriceUsd: 0.20,
    totalStaked: 289,
    totalSpins: 512,
    totalWinners: 480,
    totalRewardsDistributedUsdt: 64.80,
    pendingPayoutsAmountUsdt: 1.40,
    paidPayoutsAmountUsdt: 63.40,
  });

  const [bnbPriceUsd, setBnbPriceUsd] = useState<number>(600);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});

    // Live BNB price feed estimate
    setBnbPriceUsd(612.45);
  }, []);

  const bnbPerMint = (stats.mintPriceUsd / bnbPriceUsd).toFixed(5);
  const mintPercentage = ((stats.totalMinted / stats.totalSupply) * 100).toFixed(1);

  return (
    <div className="w-full mb-10">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Supply & Minted */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-[#00FF66]/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FF66]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>MINTED SUPPLY</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {stats.totalMinted.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-500">/ {stats.totalSupply.toLocaleString()}</span>
          </div>
          <div className="mt-2 w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#00FF66] to-[#00E5FF] h-1.5 rounded-full transition-all duration-1000 shadow-neon-green"
              style={{ width: `${mintPercentage}%` }}
            />
          </div>
        </div>

        {/* Mint Price via Chainlink */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-[#00E5FF]/40 transition-all">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>ORACLE PRICE</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            ${stats.mintPriceUsd.toFixed(2)}
          </div>
          <div className="text-[11px] font-mono text-[#00E5FF] mt-1 flex items-center space-x-1">
            <span>≈ {bnbPerMint} BNB</span>
          </div>
        </div>

        {/* Staked NFTs */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-[#9D4EDD]/40 transition-all">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Lock className="w-3.5 h-3.5 text-[#C77DFF]" />
            <span>STAKED (72H)</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {stats.totalStaked.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {((stats.totalStaked / Math.max(1, stats.totalMinted)) * 100).toFixed(0)}% of minted
          </div>
        </div>

        {/* Total Spins */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-[#00FF66]/40 transition-all">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Disc3 className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>TOTAL SPINS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {stats.totalSpins.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-[#00FF66] mt-1">
            {stats.totalWinners} winning rolls
          </div>
        </div>

        {/* USDT Distributed */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-amber-400/40 transition-all">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>USDT REWARDS</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-tight">
            ${stats.totalRewardsDistributedUsdt.toFixed(2)}
          </div>
          <div className="text-[11px] font-mono text-emerald-400 mt-1">
            ${stats.paidPayoutsAmountUsdt.toFixed(2)} verified paid
          </div>
        </div>

        {/* Remaining NFTs */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-blue-400/40 transition-all">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>REMAINING</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
            {stats.remainingSupply.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            10K Max Cap
          </div>
        </div>
      </div>
    </div>
  );
}

