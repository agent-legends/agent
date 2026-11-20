"use client";

import { useEffect, useState } from "react";
import { Flame, ShieldCheck, Sparkles, Users, Zap, Award } from "lucide-react";

interface StatsData {
  totalSupply: number;
  totalMinted: number;
  freeMintedCount: number;
  remainingSupply: number;
  remainingFreeSupply: number;
  paidPriceBnb: number;
  maxPaidPerWallet: number;
  maxPerWallet: number;
  mintPaused: boolean;
  totalUsers: number | null;
}

function displayCount(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}

export function StatsHeader() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stats")
      .then(async (response) => {
        if (!response.ok) {
          let errorMsg = "On-chain statistics are temporarily unavailable.";
          try {
            const data = await response.json();
            errorMsg = data.error || errorMsg;
          } catch {
            // Server returned non-JSON (e.g. 500 HTML)
          }
          throw new Error(errorMsg);
        }
        return response.json() as Promise<StatsData>;
      })
      .then((data) => {
        if (active) {
          setStats(data);
          setStatsError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setStatsError(error instanceof Error ? error.message : "Statistics are unavailable.");
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      icon: Sparkles,
      label: "Minted supply",
      value: stats ? `${displayCount(stats.totalMinted)} / ${displayCount(stats.totalSupply)}` : "— / 2,000",
      detail: stats ? `${displayCount(stats.remainingSupply)} remaining` : "Reading BNB Chain",
      accent: "text-sky-300",
    },
    {
      icon: ShieldCheck,
      label: "Agent wallet mint",
      value: "FREE",
      detail: stats
        ? `${displayCount(stats.freeMintedCount)} / 1,000 claimed`
        : "1 Free per Agentic Wallet",
      accent: "text-emerald-300",
    },
    {
      icon: Zap,
      label: "Paid mint",
      value: "0.0005 BNB",
      detail: "Up to 9 paid mints / wallet",
      accent: "text-violet-300",
    },
    {
      icon: Flame,
      label: "Max supply cap",
      value: "2,000",
      detail: "Exclusive total supply",
      accent: "text-amber-300",
    },
    {
      icon: Award,
      label: "Free agent reserves",
      value: "1,000 FREE",
      detail: "Reserved for Binance Agent ID",
      accent: "text-cyan-300",
    },
    {
      icon: Users,
      label: "Wallets tracked",
      value: stats?.totalUsers !== null && stats?.totalUsers !== undefined ? displayCount(stats.totalUsers) : "—",
      detail: "Active collectors",
      accent: "text-indigo-300",
    },
  ];

  return (
    <section className="stats-header" aria-labelledby="stats-header-title">
      <div className="stats-header-inner">
        <div className="stats-header-top">
          <div>
            <span className="stats-header-kicker">BNB Smart Chain (Chain ID: 56)</span>
            <h2 id="stats-header-title" className="stats-header-heading">
              Protocol Statistics
            </h2>
          </div>
          <span className="stats-header-badge">
            <span className="stats-header-dot" aria-hidden="true" />
            Live contract state
          </span>
        </div>

        {statsError && (
          <p className="stats-header-error" role="alert">
            {statsError}
          </p>
        )}

        <div className="stats-grid">
          {cards.map(({ icon: Icon, label, value, detail, accent }) => (
            <div key={label} className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">{label}</span>
                <span className={`stat-card-icon ${accent}`} aria-hidden="true">
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <p className="stat-card-value font-mono">{value}</p>
              <p className="stat-card-detail">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
