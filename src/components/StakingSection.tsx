"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { Lock, Unlock, Shield, AlertTriangle, CheckCircle2, Clock, Sparkles, Disc3 } from "lucide-react";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_STAKING_ABI, AGENT_LEGENDS_NFT_ABI } from "@/config/contracts";

interface StakedAgentItem {
  tokenId: number;
  stakedAt: number; // unix seconds
  unlockTime: number; // unix seconds
  isLocked: boolean;
  remainingSeconds: number;
}

export function StakingSection() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  const [unstakedTokens, setUnstakedTokens] = useState<number[]>([1, 2, 5]); // sample token IDs
  const [selectedToStake, setSelectedToStake] = useState<number[]>([]);
  const [selectedToUnstake, setSelectedToUnstake] = useState<number[]>([]);
  const [stakedAgents, setStakedAgents] = useState<StakedAgentItem[]>([
    {
      tokenId: 3,
      stakedAt: Math.floor(Date.now() / 1000) - 3600 * 20, // staked 20 hours ago
      unlockTime: Math.floor(Date.now() / 1000) + 3600 * 52, // 52 hours remaining
      isLocked: true,
      remainingSeconds: 3600 * 52,
    },
    {
      tokenId: 4,
      stakedAt: Math.floor(Date.now() / 1000) - 3600 * 75, // staked 75 hours ago (lock expired)
      unlockTime: Math.floor(Date.now() / 1000) - 3600 * 3,
      isLocked: false,
      remainingSeconds: 0,
    },
  ]);

  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [availableSpins, setAvailableSpins] = useState<number>(2);

  const activeContractConfig =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[97];

  const { data: hash, isPending: isTxPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Update remaining seconds countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setStakedAgents((prev) =>
        prev.map((agent) => {
          const diff = Math.max(0, agent.unlockTime - now);
          return {
            ...agent,
            isLocked: diff > 0,
            remainingSeconds: diff,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "UNLOCKED (Eligible to Unstake)";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s remaining`;
  };

  const handleToggleStakeSelect = (id: number) => {
    setSelectedToStake((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleUnstakeSelect = (id: number) => {
    setSelectedToUnstake((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStake = async () => {
    if (selectedToStake.length === 0) return;
    (writeContract as any)({
      address: activeContractConfig.staking as `0x${string}`,
      abi: AGENT_LEGENDS_STAKING_ABI,
      functionName: "stake",
      args: [selectedToStake.map((id) => BigInt(id))],
    });
  };

  const handleUnstake = async () => {
    if (selectedToUnstake.length === 0) return;
    (writeContract as any)({
      address: activeContractConfig.staking as `0x${string}`,
      abi: AGENT_LEGENDS_STAKING_ABI,
      functionName: "unstake",
      args: [selectedToUnstake.map((id) => BigInt(id))],
    });
  };

  const handleApproveAll = async () => {
    (writeContract as any)({
      address: activeContractConfig.nft as `0x${string}`,
      abi: AGENT_LEGENDS_NFT_ABI,
      functionName: "setApprovalForAll",
      args: [activeContractConfig.staking as `0x${string}`, true],
    });
    setIsApproved(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Policy Notice Banner */}
      <div className="p-4 rounded-2xl glass-panel border border-[#00FF66]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-[#00FF66] flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <h4 className="font-bold font-mono text-white tracking-wide">
              72-Hour Tactical Staking Lock & Spin Rule:
            </h4>
            <p className="text-slate-400">
              Every NFT generates <strong className="text-[#00FF66]">exactly one initial spin credit</strong> upon its first successful stake. NFTs cannot be unstaked before 72 hours. Restaking will not duplicate initial spin credits.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] font-mono text-xs font-bold whitespace-nowrap self-start sm:self-auto">
          <Disc3 className="w-4 h-4 animate-spin text-[#00FF66]" style={{ animationDuration: "8s" }} />
          <span>{availableSpins} Available Spins</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Unstaked NFTs */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-[#00FF66]" />
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                Unstaked Agents ({unstakedTokens.length})
              </h3>
            </div>
            {unstakedTokens.length > 0 && (
              <button
                onClick={() =>
                  setSelectedToStake(
                    selectedToStake.length === unstakedTokens.length ? [] : [...unstakedTokens]
                  )
                }
                className="text-[11px] font-mono text-[#00E5FF] hover:underline"
              >
                {selectedToStake.length === unstakedTokens.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {unstakedTokens.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
              <p>No unstaked Agent Legends NFTs found in this wallet.</p>
              <a href="/mint" className="text-[#00FF66] hover:underline font-bold">
                Mint your first agent now &rarr;
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {unstakedTokens.map((id) => {
                  const isSelected = selectedToStake.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => handleToggleStakeSelect(id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#00FF66]/10 border-[#00FF66] shadow-neon-green"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-[#00FF66]">
                          #{id}
                        </div>
                        <div>
                          <div className="text-xs font-bold font-mono text-white">Agent #{id}</div>
                          <div className="text-[10px] text-slate-400 font-mono">+1 Spin Credit</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-[#00FF66] focus:ring-0"
                      />
                    </div>
                  );
                })}
              </div>

              {!isApproved ? (
                <button
                  onClick={handleApproveAll}
                  disabled={isTxPending || isConfirming}
                  className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono tracking-wider hover:bg-amber-500/30 transition-all"
                >
                  Approve Staking Contract
                </button>
              ) : (
                <button
                  onClick={handleStake}
                  disabled={selectedToStake.length === 0 || isTxPending || isConfirming}
                  className={`w-full py-3.5 rounded-xl text-xs font-black font-mono tracking-wider uppercase transition-all ${
                    selectedToStake.length > 0
                      ? "bg-[#00FF66] text-[#07090E] hover:bg-[#00CC52] shadow-neon-green"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {isTxPending || isConfirming
                    ? "Locking into Staking..."
                    : `Stake ${selectedToStake.length} Selected Agent${selectedToStake.length > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Staked NFTs (72-Hour Lock) */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-[#C77DFF]" />
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                Staked Custody ({stakedAgents.length})
              </h3>
            </div>
            {stakedAgents.some((a) => !a.isLocked) && (
              <button
                onClick={() =>
                  setSelectedToUnstake(
                    selectedToUnstake.length === stakedAgents.filter((a) => !a.isLocked).length
                      ? []
                      : stakedAgents.filter((a) => !a.isLocked).map((a) => a.tokenId)
                  )
                }
                className="text-[11px] font-mono text-[#00E5FF] hover:underline"
              >
                Select Unlocked
              </button>
            )}
          </div>

          {stakedAgents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No agents currently staked in the 72-hour custody vault.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {stakedAgents.map((agent) => {
                  const isSelected = selectedToUnstake.includes(agent.tokenId);
                  return (
                    <div
                      key={agent.tokenId}
                      onClick={() => !agent.isLocked && handleToggleUnstakeSelect(agent.tokenId)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        agent.isLocked
                          ? "bg-slate-950/50 border-slate-900 opacity-85 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#9D4EDD]/20 border-[#9D4EDD] shadow-neon-purple cursor-pointer"
                          : "bg-slate-950/80 border-slate-800 hover:border-slate-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold ${
                            agent.isLocked
                              ? "bg-slate-900 text-slate-400 border border-slate-800"
                              : "bg-[#9D4EDD]/30 text-[#C77DFF] border border-[#9D4EDD]/40"
                          }`}
                        >
                          #{agent.tokenId}
                        </div>
                        <div>
                          <div className="text-xs font-bold font-mono text-white flex items-center space-x-2">
                            <span>Agent #{agent.tokenId}</span>
                            {agent.isLocked ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                72H LOCKED
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                UNLOCKED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#00E5FF]" />
                            <span className={agent.isLocked ? "text-amber-300" : "text-emerald-400"}>
                              {formatCountdown(agent.remainingSeconds)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!agent.isLocked ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-700 text-[#9D4EDD] focus:ring-0"
                        />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleUnstake}
                disabled={selectedToUnstake.length === 0 || isTxPending || isConfirming}
                className={`w-full py-3.5 rounded-xl text-xs font-black font-mono tracking-wider uppercase transition-all flex items-center justify-center space-x-2 ${
                  selectedToUnstake.length > 0
                    ? "bg-[#9D4EDD] text-white hover:bg-[#7B2CBF] shadow-neon-purple"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Unlock className="w-4 h-4" />
                <span>
                  {isTxPending || isConfirming
                    ? "Unstaking..."
                    : `Unstake ${selectedToUnstake.length} Agent${selectedToUnstake.length > 1 ? "s" : ""}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

