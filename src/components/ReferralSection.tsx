"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { Users, Copy, Check, Gift, Crown, Trophy, Sparkles, ExternalLink, AlertCircle } from "lucide-react";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_NFT_ABI } from "@/config/contracts";
import { bsc, bscTestnet } from "wagmi/chains";

interface ReferralUserStats {
  walletAddress: string;
  referralsCount: number;
  referredNftCount: number;
  earnedFreeNfts: number;
  claimedFreeNfts: number;
  unclaimedFreeNfts: number;
  nextMilestone: number;
  referralsToNext: number;
  referralUrl: string;
}

interface LeaderboardItem {
  walletAddress: string;
  successfulReferrals: number;
  referredNftCount: number;
  claimedFreeNfts: number;
}

export function ReferralSection() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [copied, setCopied] = useState<boolean>(false);
  const [stats, setStats] = useState<ReferralUserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [syncedHash, setSyncedHash] = useState<string | null>(null);

  const activeContractConfig =
    chainId === 56 ? CONTRACT_ADDRESSES[56] : chainId === 97 ? CONTRACT_ADDRESSES[97] : null;

  const { data: hash, isPending: isClaimPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    confirmations: 3,
  });

  const fetchReferralData = () => {
    const url = address ? `/api/referrals?wallet=${address}` : "/api/referrals";
    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Referral data could not be loaded.");
        return data;
      })
      .then((data) => {
        if (data.userStats) setStats(data.userStats);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      })
      .catch((error: unknown) => {
        setClaimError(error instanceof Error ? error.message : "Referral data could not be loaded.");
      });
  };

  useEffect(() => {
    fetchReferralData();
  }, [address]);

  useEffect(() => {
    if (!isConfirmed || !hash || !address || syncedHash === hash) return;
    setSyncedHash(hash);
    fetch("/api/referrals/claim/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address, txHash: hash }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Referral claim could not be synchronized.");
        await fetchReferralData();
      })
      .catch((error: unknown) => {
        setClaimError(error instanceof Error ? error.message : "Referral claim could not be synchronized.");
      });
  }, [isConfirmed, hash, address, syncedHash]);

  const referralUrl = address
    ? `https://agentlegends.xyz/?ref=${address}`
    : "https://agentlegends.xyz/?ref=0xYourWalletAddress";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimFreeNft = async () => {
    if (!stats || stats.unclaimedFreeNfts <= 0) return;
    if (!address || !activeContractConfig) {
      setClaimError("Connect a wallet on BNB Smart Chain to claim.");
      return;
    }
    setClaimError(null);
    try {
      await writeContractAsync({
        address: activeContractConfig.nft as `0x${string}`,
        account: address,
        chain: chainId === 56 ? bsc : bscTestnet,
        abi: AGENT_LEGENDS_NFT_ABI,
        functionName: "claimReferralRewards",
        args: [BigInt(1)],
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setClaimError(errorMsg);
    }
  };

  // Milestone calculation
  const referralsCount = stats?.referralsCount || 0;
  const progressToNext = (referralsCount % 3);
  const progressPercent = Math.min(100, Math.round((progressToNext / 3) * 100));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Referral Link & Dashboard Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#00FF66]/30 shadow-neon-green space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] text-xs font-mono font-bold tracking-wider mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>AGENT ALLIANCE SYNDICATE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-mono">
              Referral Protocol: 3 Wallets = 1 Free NFT
            </h2>
            <p className="text-xs text-slate-400">
              Every 3 successfully referred wallets unlocks 1 free Agent Legends NFT. Milestones are cumulative.
            </p>
          </div>

          {/* Quick Stats Pill */}
          {stats && (
            <div className="flex items-center space-x-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 self-start sm:self-auto font-mono text-xs">
              <div className="text-center px-2">
                <span className="block text-slate-500 text-[10px]">REFERRED</span>
                <span className="text-base font-black text-white">{stats.referralsCount}</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div className="text-center px-2">
                <span className="block text-slate-500 text-[10px]">NFTS MINTED</span>
                <span className="text-base font-black text-[#00E5FF]">{stats.referredNftCount}</span>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div className="text-center px-2">
                <span className="block text-slate-500 text-[10px]">FREE CLAIMABLE</span>
                <span className="text-base font-black text-[#00FF66]">{stats.unclaimedFreeNfts}</span>
              </div>
            </div>
          )}
        </div>

        {/* Unique Referral URL Box */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-300 font-semibold block">
            Your Unique Referral Link:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 truncate select-all flex items-center">
              {referralUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-6 py-3 rounded-xl bg-[#00FF66] hover:bg-[#00CC52] text-[#07090E] font-bold font-mono text-xs flex items-center justify-center space-x-2 transition-all shadow-neon-green"
            >
              {copied ? <Check className="w-4 h-4 text-[#07090E]" /> : <Copy className="w-4 h-4 text-[#07090E]" />}
              <span>{copied ? "COPIED LINK!" : "COPY LINK"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            * Referrals are permanently attributed upon the referee's first successful mint. Self-referrals are strictly rejected by the smart contract.
          </p>
        </div>

        {/* Milestone Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center space-x-1.5">
              <Gift className="w-4 h-4 text-[#00FF66]" />
              <span>Next Free NFT Milestone ({progressToNext}/3 Wallets)</span>
            </span>
            <span className="text-[#00E5FF]">
              {3 - progressToNext === 3 ? "3 referrals needed for next reward" : `${3 - progressToNext} more referral${3 - progressToNext > 1 ? "s" : ""} to unlock`}
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-[#00FF66] to-[#00E5FF] h-full rounded-full transition-all duration-700 shadow-neon-green"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>Current: {referralsCount} Referred</span>
            <span>Next Free NFT at: {((Math.floor(referralsCount / 3) + 1) * 3)} Wallets</span>
          </div>
        </div>

        {/* Free NFT Claim Card */}
        {stats && stats.unclaimedFreeNfts > 0 && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-[#00FF66]/20 border border-[#00FF66]/40 flex items-center justify-center text-[#00FF66]">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-mono text-white">
                  You Have {stats.unclaimedFreeNfts} Unclaimed Free NFT{stats.unclaimedFreeNfts > 1 ? "s" : ""}!
                </h4>
                <p className="text-xs text-slate-300">
                  Earned through the 3 referrals = 1 free NFT milestone. Counts toward 10,000 maximum supply.
                </p>
              </div>
            </div>
            <button
              onClick={handleClaimFreeNft}
              disabled={isClaimPending || isConfirming}
              className="px-6 py-3 rounded-xl bg-[#00FF66] text-[#07090E] font-black font-mono text-xs tracking-wider uppercase hover:bg-[#00CC52] transition-all shadow-neon-green flex items-center justify-center space-x-2"
            >
              <span>{isClaimPending || isConfirming ? "Minting Free NFT..." : "Claim Free NFT (0 BNB)"}</span>
            </button>
          </div>
        )}

        {claimError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{claimError}</span>
          </div>
        )}
      </div>

      {/* Referral Leaderboard */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black font-mono text-white uppercase tracking-wider">
              Top Syndicate Referrers
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Live Rankings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 w-16">Rank</th>
                <th className="pb-3">Syndicate Leader</th>
                <th className="pb-3 text-center">Successful Wallets</th>
                <th className="pb-3 text-center">Total NFTs Minted</th>
                <th className="pb-3 text-right">Free NFTs Claimed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {leaderboard.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 font-bold">
                    {idx === 0 ? (
                      <span className="flex items-center text-amber-400 space-x-1">
                        <Crown className="w-4 h-4" />
                        <span>#1</span>
                      </span>
                    ) : idx === 1 ? (
                      <span className="text-slate-300 font-bold">#2</span>
                    ) : idx === 2 ? (
                      <span className="text-amber-600 font-bold">#3</span>
                    ) : (
                      <span className="text-slate-500">#{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3 text-white font-semibold">
                    {item.walletAddress.slice(0, 6)}...{item.walletAddress.slice(-4)}
                  </td>
                  <td className="py-3 text-center text-[#00FF66] font-bold">
                    {item.successfulReferrals} Wallets
                  </td>
                  <td className="py-3 text-center text-[#00E5FF]">
                    {item.referredNftCount} NFTs
                  </td>
                  <td className="py-3 text-right text-purple-300 font-bold">
                    {item.claimedFreeNfts} Free NFTs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
