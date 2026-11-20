"use client";

import React, { useState } from "react";
import { StatsHeader } from "@/components/StatsHeader";
import { PageIntro } from "@/components/PageIntro";
import { Trophy, Crown, Users, Sparkles, Shield } from "lucide-react";

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"REFERRERS" | "MINTERS">("REFERRERS");

  const topReferrers = [
    { rank: 1, address: "0x71c890...4f89", count: 42, secondary: "118 Operatives Recruited", reward: "Syndicate Overseer" },
    { rank: 2, address: "0x34a21e...99e7", count: 33, secondary: "89 Operatives Recruited", reward: "Division Architect" },
    { rank: 3, address: "0x89d22f...4f32", count: 27, secondary: "74 Operatives Recruited", reward: "Field Marshall" },
    { rank: 4, address: "0x53d833...c3b8", count: 18, secondary: "52 Operatives Recruited", reward: "Vanguard Leader" },
    { rank: 5, address: "0x12e44c...66aa", count: 15, secondary: "39 Operatives Recruited", reward: "Tactical Captain" },
    { rank: 6, address: "0x99b12d...7710", count: 12, secondary: "31 Operatives Recruited", reward: "Strike Commander" },
    { rank: 7, address: "0x44c98a...98bb", count: 9, secondary: "24 Operatives Recruited", reward: "Elite Scout" },
    { rank: 8, address: "0x62a11b...3311", count: 6, secondary: "19 Operatives Recruited", reward: "Agent Vanguard" },
  ];

  const topMinters = [
    { rank: 1, address: "0x71c890...4f89", count: "10 Agents", secondary: "0.0045 BNB Paid + 1 Free", reward: "Fleet Admiral" },
    { rank: 2, address: "0x34a21e...99e7", count: "10 Agents", secondary: "0.0045 BNB Paid + 1 Free", reward: "Taskforce Commander" },
    { rank: 3, address: "0x89d22f...4f32", count: "10 Agents", secondary: "0.0045 BNB Paid + 1 Free", reward: "Division Commander" },
    { rank: 4, address: "0x53d833...c3b8", count: "8 Agents", secondary: "0.0035 BNB Paid + 1 Free", reward: "Squadron Leader" },
    { rank: 5, address: "0x12e44c...66aa", count: "6 Agents", secondary: "0.0025 BNB Paid + 1 Free", reward: "Tactical Captain" },
  ];

  const activeList = activeTab === "REFERRERS" ? topReferrers : topMinters;

  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="Community activity"
        title="Leaderboard"
        description="Browse the current referral and collector rankings across BNB Smart Chain."
        icon={Trophy}
      />

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
                  {activeTab === "REFERRERS" ? "Referred Wallets" : "Operatives"}
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
                      <span className="flex items-center text-amber-300 gap-1">
                        <Crown className="w-3.5 h-3.5" /> #1
                      </span>
                    ) : item.rank === 2 ? (
                      <span className="text-slate-300">#2</span>
                    ) : item.rank === 3 ? (
                      <span className="text-amber-600">#3</span>
                    ) : (
                      <span className="text-slate-500">#{item.rank}</span>
                    )}
                  </td>
                  <td className="py-3.5 text-white font-bold">{item.address}</td>
                  <td className="py-3.5 text-center text-[#00FF66] font-bold">{item.count}</td>
                  <td className="py-3.5 text-center text-slate-400">{item.secondary}</td>
                  <td className="py-3.5 text-right text-slate-300 font-semibold">{item.reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
