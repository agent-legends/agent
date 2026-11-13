"use client";

import React, { useState } from "react";
import { StatsHeader } from "@/components/StatsHeader";
import { Trophy, Crown, Users, Award, Sparkles, Shield } from "lucide-react";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"REFERRERS" | "WINNERS" | "MINTERS">("REFERRERS");

  const topReferrers = [
    { rank: 1, address: "0x71c890...4f89", count: 42, secondary: "118 NFTs Minted", reward: "14 Free NFTs" },
    { rank: 2, address: "0x34a21e...99e7", count: 33, secondary: "89 NFTs Minted", reward: "11 Free NFTs" },
    { rank: 3, address: "0x89d22f...4f32", count: 27, secondary: "74 NFTs Minted", reward: "9 Free NFTs" },
    { rank: 4, address: "0x53d833...c3b8", count: 18, secondary: "52 NFTs Minted", reward: "6 Free NFTs" },
    { rank: 5, address: "0x12e44c...66aa", count: 15, secondary: "39 NFTs Minted", reward: "5 Free NFTs" },
    { rank: 6, address: "0x99b12d...7710", count: 12, secondary: "31 NFTs Minted", reward: "4 Free NFTs" },
    { rank: 7, address: "0x44c98a...98bb", count: 9, secondary: "24 NFTs Minted", reward: "3 Free NFTs" },
    { rank: 8, address: "0x62a11b...3311", count: 6, secondary: "19 NFTs Minted", reward: "2 Free NFTs" },
  ];

  const topWinners = [
    { rank: 1, address: "0x89d22f...4f32", count: "$18.40 USDT", secondary: "82 Spins Completed", reward: "Apex High Roller" },
    { rank: 2, address: "0x44c98a...98bb", count: "$14.70 USDT", secondary: "65 Spins Completed", reward: "Cipher Tactician" },
    { rank: 3, address: "0x71c890...4f89", count: "$11.20 USDT", secondary: "54 Spins Completed", reward: "Phantom Operative" },
    { rank: 4, address: "0x12e44c...66aa", count: "$8.90 USDT", secondary: "41 Spins Completed", reward: "Vanguard Veteran" },
    { rank: 5, address: "0x34a21e...99e7", count: "$7.50 USDT", secondary: "38 Spins Completed", reward: "Agent Veteran" },
  ];

  const topMinters = [
    { rank: 1, address: "0x71c890...4f89", count: "120 Agents", secondary: "$24.00 BNB Minted", reward: "Fleet Admiral" },
    { rank: 2, address: "0x34a21e...99e7", count: "95 Agents", secondary: "$19.00 BNB Minted", reward: "Taskforce Commander" },
    { rank: 3, address: "0x89d22f...4f32", count: "80 Agents", secondary: "$16.00 BNB Minted", reward: "Division Commander" },
    { rank: 4, address: "0x53d833...c3b8", count: "55 Agents", secondary: "$11.00 BNB Minted", reward: "Squadron Leader" },
    { rank: 5, address: "0x12e44c...66aa", count: "40 Agents", secondary: "$8.00 BNB Minted", reward: "Tactical Captain" },
  ];

  const activeList =
    activeTab === "REFERRERS" ? topReferrers : activeTab === "WINNERS" ? topWinners : topMinters;

  return (
    <div className="space-y-12">
      <StatsHeader />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold tracking-wider">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>HALL OF TACTICAL LEGENDS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider font-mono">
          Global Leaderboard
        </h1>
        <p className="text-xs text-slate-400">
          Rankings of the top syndicate referrers, highest prize-wheel winners, and largest collection commanders.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex space-x-1 font-mono text-xs">
          <button
            onClick={() => setActiveTab("REFERRERS")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "REFERRERS"
                ? "bg-[#00FF66] text-[#07090E] shadow-neon-green"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Top Referrers</span>
          </button>
          <button
            onClick={() => setActiveTab("WINNERS")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "WINNERS"
                ? "bg-amber-400 text-[#07090E] shadow-[0_0_15px_rgba(255,183,3,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Top Spin Winners</span>
          </button>
          <button
            onClick={() => setActiveTab("MINTERS")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "MINTERS"
                ? "bg-[#00E5FF] text-[#07090E] shadow-neon-blue"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Top Minters</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 w-20">Rank</th>
                <th className="pb-3">Tactical Wallet</th>
                <th className="pb-3 text-center">
                  {activeTab === "REFERRERS" ? "Referred Wallets" : activeTab === "WINNERS" ? "USDT Won" : "Operatives"}
                </th>
                <th className="pb-3 text-center">Activity Metric</th>
                <th className="pb-3 text-right">Syndicate Distinction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 font-bold">
                    {item.rank === 1 ? (
                      <span className="flex items-center text-amber-400 space-x-1.5 font-black">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>#1</span>
                      </span>
                    ) : item.rank === 2 ? (
                      <span className="text-slate-200 font-bold">#2</span>
                    ) : item.rank === 3 ? (
                      <span className="text-amber-600 font-bold">#3</span>
                    ) : (
                      <span className="text-slate-500">#{item.rank}</span>
                    )}
                  </td>
                  <td className="py-3.5 text-white font-semibold">{item.address}</td>
                  <td className="py-3.5 text-center text-[#00FF66] font-black text-sm">
                    {typeof item.count === "number" ? `${item.count} Wallets` : item.count}
                  </td>
                  <td className="py-3.5 text-center text-slate-400">{item.secondary}</td>
                  <td className="py-3.5 text-right font-bold text-purple-300">{item.reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

