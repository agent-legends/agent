"use client";

import { useEffect, useState } from "react";
import { Award, Disc3, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";

interface StatsData {
  totalSupply: number;
  totalMinted: number;
  remainingSupply: number;
  platformFeeUsdPerNft: number;
  indexedStatsAvailable: boolean;
  totalStaked: number | null;
  totalSpins: number | null;
  totalWinners: number | null;
  totalRewardsDistributedUsdt: number | null;
  pendingPayoutsCount: number | null;
  pendingPayoutsAmountUsdt: number | null;
  paidPayoutsAmountUsdt: number | null;
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
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "On-chain statistics are unavailable.");
        return data as StatsData;
      })
      .then((data) => {
        if (active) setStats(data);
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
      value: stats ? `${displayCount(stats.totalMinted)} / ${displayCount(stats.totalSupply)}` : "—",
      detail: stats ? `${displayCount(stats.remainingSupply)} remaining` : "Reading BNB Chain",
      accent: "text-sky-300",
    },
    {
      icon: ShieldCheck,
      label: "NFT mint",
      value: "FREE",
      detail: stats ? `$${stats.platformFeeUsdPerNft.toFixed(2)} platform fee / NFT · gas extra` : "Platform fee plus gas",
      accent: "text-violet-300",
    },
    {
      icon: LockKeyhole,
      label: "Staked NFTs",
      value: displayCount(stats?.totalStaked),
      detail: "Application-indexed activity",
      accent: "text-indigo-300",
    },
    {
      icon: Disc3,
      label: "Completed spins",
      value: displayCount(stats?.totalSpins),
      detail: stats ? `${displayCount(stats.totalWinners)} USDT prize results` : "Off-chain result records",
      accent: "text-cyan-300",
    },
    {
      icon: Award,
      label: "USDT verified paid",
      value:
        stats?.paidPayoutsAmountUsdt === null || stats?.paidPayoutsAmountUsdt === undefined
          ? "—"
          : `$${stats.paidPayoutsAmountUsdt.toFixed(2)}`,
      detail: stats ? `${displayCount(stats.pendingPayoutsCount)} payouts pending` : "Manual payout records",
      accent: "text-amber-300",
    },
    {
      icon: Users,
      label: "Wallets tracked",
      value: displayCount(stats?.totalUsers),
      detail: "Application analytics",
      accent: "text-blue-300",
    },
  ];

  return (
    <section className="stats-grid" aria-label="Agent Legends platform statistics" aria-live="polite">
      {cards.map(({ icon: Icon, label, value, detail, accent }) => (
        <article className="stats-card glass-panel" key={label}>
          <div className={`stats-card-label ${accent}`}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </div>
          <strong className="stats-card-value">{value}</strong>
          <span className="stats-card-detail">{detail}</span>
        </article>
      ))}
      {(statsError || stats?.indexedStatsAvailable === false) && (
        <p className="stats-error" role="status">
          {statsError || "Some application-indexed metrics are temporarily unavailable."}
        </p>
      )}
    </section>
  );
}
