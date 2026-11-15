"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { PageIntro } from "@/components/PageIntro";
import { StatsHeader } from "@/components/StatsHeader";
import { Award, Clock, CheckCircle2, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export default function RewardsPage() {
  const { address } = useAccount();
  const [userData, setUserData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetch(`/api/user?wallet=${address}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Reward data is unavailable.");
          setUserData(data);
          setPayouts(data.recentPayouts || []);
        })
        .catch((error: unknown) => {
          setErrorMessage(error instanceof Error ? error.message : "Reward data is unavailable.");
        });
    }
  }, [address]);

  const chainConfig =
    Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) === 56
      ? CONTRACT_ADDRESSES[56]
      : CONTRACT_ADDRESSES[97];

  return (
    <div className="space-y-12">
      <StatsHeader />

      <PageIntro
        eyebrow="Reward history"
        title="USDT payouts"
        description="Review your USDT prizes, payout status, and confirmed BNB Smart Chain transactions."
        icon={Award}
      />

      {errorMessage && (
        <p className="max-w-4xl mx-auto text-xs text-amber-300" role="alert">{errorMessage}</p>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Total Won */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Award className="w-4 h-4 text-[#00FF66]" />
            <span>LIFETIME WON</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${Number(userData?.totalRewardsWonUsdt ?? 0).toFixed(2)} USDT
          </div>
          <span className="text-[11px] font-mono text-slate-500">From prize-wheel rolls</span>
        </div>

        {/* Pending Payout */}
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400">
            <Clock className="w-4 h-4" />
            <span>PENDING DISPATCH</span>
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            ${Number(userData?.pendingPayoutUsdt ?? 0).toFixed(2)} USDT
          </div>
          <span className="text-[11px] font-mono text-amber-400/80">Awaiting transfer</span>
        </div>

        {/* Verified Paid */}
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>VERIFIED PAID</span>
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            ${Number(userData?.paidPayoutUsdt ?? 0).toFixed(2)} USDT
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80">Confirmed on BSC blockchain</span>
        </div>
      </div>

      {/* Official Token Disclaimer */}
      <div className="max-w-4xl mx-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-[#00E5FF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Verified BNB Smart Chain USDT Contract:</span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            BNB Smart Chain USDT token contract: {chainConfig.usdt}. Payout status changes to Paid after the transfer is confirmed on-chain.
          </p>
        </div>
      </div>

      {/* Payout History Ledger */}
      <div className="max-w-4xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono">
            <Clock className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              Reward History
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Live Status</span>
        </div>

        {payouts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No USDT payouts recorded for this wallet yet. Spin the prize wheel to earn rewards!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3">Spin ID</th>
                  <th className="pb-3">Reward</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">BSC Transaction Hash</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.map((p, idx) => (
                  <tr key={p.spinId || idx} className="hover:bg-slate-900/40">
                    <td className="py-3 text-slate-300 font-medium">{p.spinId}</td>
                    <td className="py-3 text-white font-bold">${p.rewardAmountUsdt.toFixed(2)} USDT</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : p.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : p.status === "REJECTED"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {p.txHash ? (
                        <a
                          href={`${chainConfig.explorer}/tx/${p.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-[#00FF66] hover:underline"
                        >
                          <span>{p.txHash.slice(0, 8)}...{p.txHash.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Awaiting Dispatch</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
