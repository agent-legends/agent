"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { Lock, Unlock, Shield, AlertTriangle, CheckCircle2, Clock, Sparkles, Disc3 } from "lucide-react";
import { createPublicClient, http, isAddress, parseAbi } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_STAKING_ABI, AGENT_LEGENDS_NFT_ABI } from "@/config/contracts";

const NFT_READ_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
] as const);
const STAKING_READ_ABI = parseAbi([
  "function getUserStakedTokens(address user) view returns (uint256[])",
  "function hasGeneratedInitialSpin(uint256 tokenId) view returns (bool)",
  "function getStakeDetails(uint256 tokenId) view returns (address owner, uint64 stakedAt, uint256 unlockTime, bool isLocked)",
] as const);

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

  const [unstakedTokens, setUnstakedTokens] = useState<number[]>([]);
  const [initialSpinAwardedTokens, setInitialSpinAwardedTokens] = useState<Set<number>>(new Set());
  const [selectedToStake, setSelectedToStake] = useState<number[]>([]);
  const [selectedToUnstake, setSelectedToUnstake] = useState<number[]>([]);
  const [stakedAgents, setStakedAgents] = useState<StakedAgentItem[]>([]);

  const [isApproved, setIsApproved] = useState(false);
  const [availableSpins, setAvailableSpins] = useState(0);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"STAKE" | "UNSTAKE" | "APPROVE" | null>(null);
  const [syncedHash, setSyncedHash] = useState<string | null>(null);

  const activeContractConfig =
    chainId === 56 ? CONTRACT_ADDRESSES[56] : chainId === 97 ? CONTRACT_ADDRESSES[97] : null;

  const { data: hash, isPending: isTxPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    confirmations: 3,
  });

  const refreshChainData = useCallback(async () => {
    if (!address || !activeContractConfig) {
      setUnstakedTokens([]);
      setInitialSpinAwardedTokens(new Set());
      setStakedAgents([]);
      setAvailableSpins(0);
      setIsApproved(false);
      return;
    }

    const nftAddress = activeContractConfig.nft;
    const stakingAddress = activeContractConfig.staking;
    if (!isAddress(nftAddress) || !isAddress(stakingAddress)) {
      setUnstakedTokens([]);
      setInitialSpinAwardedTokens(new Set());
      setStakedAgents([]);
      setAvailableSpins(0);
      setIsApproved(false);
      setStakingError("NFT and staking contract addresses must be configured for this BNB Chain.");
      return;
    }

    const publicClient = createPublicClient({
      chain: chainId === 56 ? bsc : bscTestnet,
      transport: http(activeContractConfig.rpcUrl),
    });
    setIsLoadingAgents(true);
    setStakingError(null);
    try {
      const [balance, stakedTokenIds, approved, userResponse] = await Promise.all([
        publicClient.readContract({
          address: nftAddress,
          abi: NFT_READ_ABI,
          functionName: "balanceOf",
          args: [address],
          authorizationList: undefined,
        }),
        publicClient.readContract({
          address: stakingAddress,
          abi: STAKING_READ_ABI,
          functionName: "getUserStakedTokens",
          args: [address],
          authorizationList: undefined,
        }),
        publicClient.readContract({
          address: nftAddress,
          abi: NFT_READ_ABI,
          functionName: "isApprovedForAll",
          args: [address, stakingAddress],
          authorizationList: undefined,
        }),
        fetch(`/api/user?wallet=${address}`),
      ]);

      const walletTokenIds = await Promise.all(
        Array.from({ length: Number(balance) }, (_, index) =>
          publicClient.readContract({
            address: nftAddress,
            abi: NFT_READ_ABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(index)],
            authorizationList: undefined,
          })
        )
      );
      const initialSpinFlags = await Promise.all(
        walletTokenIds.map((tokenId) =>
          publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_READ_ABI,
            functionName: "hasGeneratedInitialSpin",
            args: [tokenId],
            authorizationList: undefined,
          })
        )
      );
      const stakeDetails = await Promise.all(
        stakedTokenIds.map((tokenId) =>
          publicClient.readContract({
            address: stakingAddress,
            abi: STAKING_READ_ABI,
            functionName: "getStakeDetails",
            args: [tokenId],
            authorizationList: undefined,
          })
        )
      );
      const userData = await userResponse.json();
      if (!userResponse.ok) throw new Error(userData.error || "Spin balances are unavailable.");

      const stakedSet = new Set(stakedTokenIds.map((tokenId) => tokenId.toString()));
      setUnstakedTokens(
        walletTokenIds
          .filter((tokenId) => !stakedSet.has(tokenId.toString()))
          .map(Number)
      );
      setInitialSpinAwardedTokens(
        new Set(
          walletTokenIds
            .filter((_, index) => initialSpinFlags[index])
            .map(Number)
        )
      );
      setStakedAgents(
        stakedTokenIds.map((tokenId, index) => {
          const [, stakedAt, unlockTime, isLocked] = stakeDetails[index];
          const unlockAt = Number(unlockTime);
          return {
            tokenId: Number(tokenId),
            stakedAt: Number(stakedAt),
            unlockTime: unlockAt,
            isLocked,
            remainingSeconds: Math.max(0, unlockAt - Math.floor(Date.now() / 1000)),
          };
        })
      );
      setIsApproved(approved);
      setAvailableSpins(userData.availableSpins);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [address, activeContractConfig, chainId]);

  useEffect(() => {
    refreshChainData().catch((error: unknown) => {
      setStakingError(error instanceof Error ? error.message : "Staking data could not be loaded.");
    });
  }, [refreshChainData]);

  useEffect(() => {
    if (!isConfirmed || !hash || !address || !pendingAction || syncedHash === hash) return;
    setSyncedHash(hash);
    if (pendingAction === "APPROVE") {
      setPendingAction(null);
      refreshChainData().catch((error: unknown) => {
        setStakingError(error instanceof Error ? error.message : "Staking data could not be refreshed.");
      });
      return;
    }

    fetch("/api/staking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address, txHash: hash }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Staking record could not be synchronized.");
        await refreshChainData();
        setPendingAction(null);
      })
      .catch((error: unknown) => {
        setStakingError(error instanceof Error ? error.message : "Staking record could not be synchronized.");
      });
  }, [isConfirmed, hash, address, pendingAction, syncedHash, refreshChainData]);

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
    if (!activeContractConfig || !address) return;
    try {
      setPendingAction("STAKE");
      await writeContractAsync({
        address: activeContractConfig.staking as `0x${string}`,
        account: address,
        chain: chainId === 56 ? bsc : bscTestnet,
        abi: AGENT_LEGENDS_STAKING_ABI,
        functionName: "stake",
        args: [selectedToStake.map((id) => BigInt(id))],
      });
    } catch (error: unknown) {
      setPendingAction(null);
      setStakingError(error instanceof Error ? error.message : "Staking transaction failed.");
    }
  };

  const handleUnstake = async () => {
    if (selectedToUnstake.length === 0) return;
    if (!activeContractConfig || !address) return;
    try {
      setPendingAction("UNSTAKE");
      await writeContractAsync({
        address: activeContractConfig.staking as `0x${string}`,
        account: address,
        chain: chainId === 56 ? bsc : bscTestnet,
        abi: AGENT_LEGENDS_STAKING_ABI,
        functionName: "unstake",
        args: [selectedToUnstake.map((id) => BigInt(id))],
      });
    } catch (error: unknown) {
      setPendingAction(null);
      setStakingError(error instanceof Error ? error.message : "Unstaking transaction failed.");
    }
  };

  const handleApproveAll = async () => {
    if (!activeContractConfig || !address) return;
    try {
      setPendingAction("APPROVE");
      await writeContractAsync({
        address: activeContractConfig.nft as `0x${string}`,
        account: address,
        chain: chainId === 56 ? bsc : bscTestnet,
        abi: AGENT_LEGENDS_NFT_ABI,
        functionName: "setApprovalForAll",
        args: [activeContractConfig.staking as `0x${string}`, true],
      });
    } catch (error: unknown) {
      setPendingAction(null);
      setStakingError(error instanceof Error ? error.message : "NFT approval failed.");
    }
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
          {stakingError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs" role="alert">
              {stakingError}
            </div>
          )}
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

          {isLoadingAgents ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">Loading on-chain NFT ownership...</div>
          ) : unstakedTokens.length === 0 ? (
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
                          <div className="text-[10px] text-slate-400 font-mono">
                            {initialSpinAwardedTokens.has(id)
                              ? "Initial spin already awarded"
                              : "+1 initial spin on first stake"}
                          </div>
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
                  disabled={!isConnected || !activeContractConfig || isTxPending || isConfirming}
                  className="w-full py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono tracking-wider hover:bg-amber-500/30 transition-all"
                >
                  Approve Staking Contract
                </button>
              ) : (
                <button
                  onClick={handleStake}
                  disabled={!isConnected || !activeContractConfig || selectedToStake.length === 0 || isTxPending || isConfirming}
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
                disabled={!isConnected || !activeContractConfig || selectedToUnstake.length === 0 || isTxPending || isConfirming}
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
