"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useChainId, useSignMessage } from "wagmi";
import { Shield, ShieldAlert, Award, Disc3, Users, CheckCircle2, XCircle, ExternalLink, Download, Lock, Unlock, AlertCircle, RefreshCw } from "lucide-react";
import { isPublicAdminWallet } from "@/lib/publicAdminAuth";
import { createAdminLoginMessage } from "@/lib/authMessages";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_NFT_ABI, AGENT_LEGENDS_STAKING_ABI } from "@/config/contracts";

interface PayoutItem {
  id: string;
  spinId: string;
  walletAddress: string;
  rewardAmountUsdt: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "REJECTED";
  txHash?: string;
  verifiedAt?: string;
  adminNote?: string;
  createdAt: string;
}

export default function AdminPage() {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();

  const [activeTab, setActiveTab] = useState<"PAYOUTS" | "NFT_STAKING" | "SPINS" | "AUDIT">("PAYOUTS");
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [spins, setSpins] = useState<any[]>([]);
  const [txHashInput, setTxHashInput] = useState<{ [spinId: string]: string }>({});
  const [verifyingSpinId, setVerifyingSpinId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const isAdmin = isPublicAdminWallet(address);
  const chainConfig = chainId === 56 ? CONTRACT_ADDRESSES[56] : CONTRACT_ADDRESSES[97];

  const handleAdminLogin = async () => {
    if (!address) return;
    setAuthenticating(true);
    setActionMessage(null);
    try {
      const timestamp = Date.now();
      const requestId = crypto.randomUUID();
      const signature = await signMessageAsync({
        account: address,
        message: createAdminLoginMessage(address, timestamp, requestId),
      });
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, timestamp, requestId, signature }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Admin authentication failed.");
      setAuthenticated(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setActionMessage({ text: message, isError: true });
    } finally {
      setAuthenticating(false);
    }
  };

  const fetchPayouts = () => {
    fetch("/api/payouts")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payout records could not be loaded.");
        return data;
      })
      .then((data) => {
        if (data && Array.isArray(data.payouts)) {
          setPayouts(data.payouts);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes("authentication")) setAuthenticated(false);
        setActionMessage({
          text: error instanceof Error ? error.message : "Payout records could not be loaded.",
          isError: true,
        });
      });
  };

  const fetchSpins = () => {
    fetch("/api/spins?limit=50")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Spin history could not be loaded.");
        return data;
      })
      .then((data) => {
        if (data && Array.isArray(data.spins)) {
          setSpins(data.spins);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes("authentication")) setAuthenticated(false);
        setActionMessage({
          text: error instanceof Error ? error.message : "Spin history could not be loaded.",
          isError: true,
        });
      });
  };

  const fetchStats = () => {
    fetch("/api/stats")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Platform statistics could not be loaded.");
        setStats(data);
      })
      .catch((error: unknown) => {
        setActionMessage({
          text: error instanceof Error ? error.message : "Platform statistics could not be loaded.",
          isError: true,
        });
      });
  };

  useEffect(() => {
    if (isAdmin && authenticated) {
      fetchPayouts();
      fetchSpins();
      fetchStats();
    }
  }, [isAdmin, authenticated, address]);

  useEffect(() => {
    if (!isAdmin || !address) {
      setAuthenticated(false);
      return;
    }

    fetch("/api/admin/session")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Admin session could not be checked.");
        setAuthenticated(
          data.authenticated && data.walletAddress?.toLowerCase() === address.toLowerCase()
        );
      })
      .catch((error: unknown) => {
        setActionMessage({
          text: error instanceof Error ? error.message : "Admin session could not be checked.",
          isError: true,
        });
      });
  }, [isAdmin, address]);

  const handleVerifyPayout = async (spinId: string) => {
    const txHash = txHashInput[spinId]?.trim();
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      setActionMessage({ text: "Please enter a valid 66-character BSC transaction hash (0x...)", isError: true });
      return;
    }

    setVerifyingSpinId(spinId);
    setActionMessage(null);

    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_PAYOUT",
          spinId,
          txHash,
          adminNote: `Verified by ${address} on chain ${chainId}.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Verification failed");
      }

      setActionMessage({ text: `Payout verified and confirmed on BNB Chain for ${spinId}!`, isError: false });
      fetchPayouts();
      fetchSpins();
      fetchStats();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: errorMsg, isError: true });
    } finally {
      setVerifyingSpinId(null);
    }
  };

  const handleRejectPayout = async (spinId: string) => {
    const reason = prompt("Enter audit rejection reason:");
    if (!reason) return;

    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT_PAYOUT",
          spinId,
          rejectionReason: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionMessage({ text: `Payout ${spinId} rejected.`, isError: false });
      fetchPayouts();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setActionMessage({ text: errorMsg, isError: true });
    }
  };

  const handleStartPayout = async (spinId: string) => {
    try {
      const response = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_PAYOUT", spinId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not move payout to processing.");
      setActionMessage({ text: `Payout ${spinId} is now processing.`, isError: false });
      fetchPayouts();
    } catch (error: unknown) {
      setActionMessage({
        text: error instanceof Error ? error.message : "Could not update payout.",
        isError: true,
      });
    }
  };

  const handleAdminLogout = async () => {
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Admin session could not be closed.");
      setAuthenticated(false);
      setPayouts([]);
      setSpins([]);
    } catch (error: unknown) {
      setActionMessage({
        text: error instanceof Error ? error.message : "Admin session could not be closed.",
        isError: true,
      });
    }
  };

  const exportCsv = (filename: string, rows: object[]) => {
    if (!rows.length) return;
    const separator = ",";
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      "\n" +
      rows
        .map((row) =>
          keys
            .map((k) => {
              let val = (row as any)[k];
              if (typeof val === "string") val = `"${val.replace(/"/g, '""')}"`;
              return val ?? "";
            })
            .join(separator)
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-12 rounded-3xl text-center space-y-4 my-12">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Admin Authentication Required</h2>
        <p className="text-xs text-slate-400">
          Please connect an authorized administrative Web3 wallet to access Agent Legends 2.0 governance and payout controls.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-12 rounded-3xl text-center space-y-4 my-12 border border-red-500/30">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Admin Wallet Not Configured</h2>
        <p className="text-xs text-slate-400">
          This wallet is not listed in the public admin wallet configuration. Server-side authorization is independently enforced.
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-12 rounded-3xl text-center space-y-4 my-12">
        <Shield className="w-12 h-12 text-[#00FF66] mx-auto" />
        <h2 className="text-xl font-bold font-mono text-white">Admin Signature Required</h2>
        <p className="text-xs text-slate-400">
          Sign a short-lived login message with the configured admin wallet. The signature does not authorize a blockchain transaction.
        </p>
        {actionMessage && (
          <p className="text-xs text-red-300" role="alert">{actionMessage.text}</p>
        )}
        <button
          onClick={handleAdminLogin}
          disabled={authenticating}
          className="px-5 py-3 rounded-xl bg-[#00FF66] text-[#07090E] font-bold font-mono text-xs disabled:opacity-50"
        >
          {authenticating ? "AUTHENTICATING..." : "AUTHENTICATE ADMIN"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-[#9D4EDD]/40 shadow-neon-purple">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#9D4EDD]/20 text-[#C77DFF] text-xs font-mono font-bold tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>ROLE: PROTOCOL ADMINISTRATOR</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-mono">
            Control Center & Payout Pipeline
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Logged in as: <span className="text-[#00FF66]">{address}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchPayouts();
              fetchSpins();
              fetchStats();
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            title="Refresh All Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleAdminLogout}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono"
          >
            Sign out
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center space-x-2 ${
            actionMessage.isError
              ? "bg-red-500/15 border border-red-500/30 text-red-200"
              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
          }`}
        >
          {actionMessage.isError ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Admin Nav Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
        {[
          { key: "PAYOUTS", label: `USDT Payout Queue (${payouts.filter((p) => p.status === "PENDING").length})` },
          { key: "NFT_STAKING", label: "NFT & Staking Controls" },
          { key: "SPINS", label: "All Spin Results" },
          { key: "AUDIT", label: "Audit Ledger & Export" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-[#00FF66] text-[#07090E] shadow-neon-green"
                : "text-slate-400 hover:text-white bg-slate-900/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: USDT Payout Queue */}
      {activeTab === "PAYOUTS" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Pending Manual USDT Payout Queue</span>
              </h3>
              <p className="text-xs text-slate-400">
                Admin sends USDT to winner wallet and submits the BSC transaction hash. Status changes to Paid only after verified on-chain.
              </p>
            </div>
            <button
              onClick={() => exportCsv("usdt_payouts.csv", payouts)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1.5 hover:text-white self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3">Spin ID</th>
                  <th className="pb-3">Winner Wallet</th>
                  <th className="pb-3">USDT Reward</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">BSC Tx Hash</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.map((p) => {
                  const isActionable = p.status === "PENDING" || p.status === "PROCESSING";
                  return (
                    <tr key={p.spinId} className="hover:bg-slate-900/40">
                      <td className="py-3 text-slate-300 font-bold">{p.spinId}</td>
                      <td className="py-3">
                        <span className="text-white font-medium">{p.walletAddress}</span>
                        <a
                          href={`${chainConfig.explorer}/address/${p.walletAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1.5 inline-block text-[#00E5FF] hover:underline"
                        >
                          ↗
                        </a>
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">${p.rewardAmountUsdt.toFixed(2)} USDT</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "PAID"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : p.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : p.status === "PROCESSING"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.status === "PAID" ? (
                          <a
                            href={`${chainConfig.explorer}/tx/${p.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00FF66] hover:underline flex items-center space-x-1"
                          >
                            <span>{p.txHash?.slice(0, 8)}...{p.txHash?.slice(-6)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <input
                            type="text"
                            placeholder="Paste 0x... BSC Tx Hash"
                            value={txHashInput[p.spinId] || ""}
                            onChange={(e) =>
                              setTxHashInput({ ...txHashInput, [p.spinId]: e.target.value })
                            }
                            className="w-48 px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-[#00FF66]"
                          />
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {isActionable ? (
                          <div className="flex items-center justify-end space-x-2">
                            {p.status === "PENDING" && (
                              <button
                                onClick={() => handleStartPayout(p.spinId)}
                                className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-[11px]"
                              >
                                Processing
                              </button>
                            )}
                            {p.status === "PROCESSING" && (
                              <button
                                onClick={() => handleVerifyPayout(p.spinId)}
                                disabled={verifyingSpinId === p.spinId}
                                className="px-3 py-1 rounded bg-[#00FF66] text-[#07090E] font-bold text-[11px] hover:bg-[#00CC52] transition-colors"
                              >
                                {verifyingSpinId === p.spinId ? "Verifying..." : "Verify & Mark Paid"}
                              </button>
                            )}
                            {p.status === "PENDING" && (
                              <button
                                onClick={() => handleRejectPayout(p.spinId)}
                                className="px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[11px]"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: NFT & Staking Controls */}
      {activeTab === "NFT_STAKING" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#9D4EDD]" />
            <span>Smart Contract Protocol Controls</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Total Supply Cap:</span>
              <div className="text-xl font-bold text-white">10,000 Operatives</div>
              <p className="text-[11px] text-slate-500">Includes all regular and free referral NFTs.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Staking Lock Duration:</span>
              <div className="text-xl font-bold text-[#9D4EDD]">72 Hours</div>
              <p className="text-[11px] text-slate-500">Enforced by smart contract timestamps.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Mint Oracle Reference:</span>
              <div className="text-xl font-bold text-[#00FF66]">$0.20 USD</div>
              <p className="text-[11px] text-slate-500">Chainlink BNB/USD Aggregator.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: All Spins Results */}
      {activeTab === "SPINS" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center space-x-2">
              <Disc3 className="w-4 h-4 text-[#00FF66]" />
              <span>Complete Cryptographic Spin Audit Log</span>
            </h3>
            <button
              onClick={() => exportCsv("spins_audit.csv", spins)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1.5 hover:text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3">Spin ID</th>
                  <th className="pb-3">Player Wallet</th>
                  <th className="pb-3">Random Roll</th>
                  <th className="pb-3">Outcome</th>
                  <th className="pb-3">USDT Reward</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {spins.map((s, idx) => (
                  <tr key={s.spinId || idx} className="hover:bg-slate-900/40">
                    <td className="py-3 text-slate-300 font-bold">{s.spinId}</td>
                    <td className="py-3 text-white">{s.walletAddress}</td>
                    <td className="py-3 text-[#00FF66]">#{s.randomNumber} / 9999</td>
                    <td className="py-3 text-slate-200">{s.label || s.outcome}</td>
                    <td className="py-3 text-amber-300 font-bold">
                      {s.rewardAmountUsdt > 0 ? `$${s.rewardAmountUsdt.toFixed(2)} USDT` : s.isFreeSpinAwarded ? "1 Free Spin" : "-"}
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit & Export */}
      {activeTab === "AUDIT" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
            Protocol Security, Economic Assurances & Export
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <p>• Payout verification is locked: once status is Paid, records cannot be modified or deleted.</p>
            <p>• Centralized CSPRNG outcomes are disclosed to players and recorded in the admin history; they are not independently verifiable VRF results.</p>
            <p>• USDT transfers are matched against official BSC token transfer logs with 18 decimal precision.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => exportCsv("payouts_all.csv", payouts)}
              className="px-4 py-2 rounded-xl bg-[#00FF66] text-[#07090E] font-bold font-mono text-xs shadow-neon-green"
            >
              Export Payout History CSV
            </button>
            <button
              onClick={() => exportCsv("spins_all.csv", spins)}
              className="px-4 py-2 rounded-xl bg-[#00E5FF] text-[#07090E] font-bold font-mono text-xs shadow-neon-blue"
            >
              Export Spins History CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
