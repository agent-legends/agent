"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import confetti from "canvas-confetti";
import { Disc3, AlertCircle, CheckCircle2, Clock, Volume2, VolumeX } from "lucide-react";
import { createSpinMessage } from "@/lib/authMessages";

interface SpinResultData {
  spinId: string;
  walletAddress: string;
  outcome: string;
  label: string;
  rewardAmountUsdt: number;
  isFreeSpinAwarded: boolean;
  isWinner: boolean;
  timestamp: string;
  requiresPayout: boolean;
}

const WHEEL_SECTORS = [
  { id: "USD_0_10", label: "$0.10 USDT", color: "#00FF66", textColor: "#07090E" },
  { id: "USD_0_20", label: "$0.20 USDT", color: "#00E5FF", textColor: "#07090E" },
  { id: "USD_0_50", label: "$0.50 USDT", color: "#9D4EDD", textColor: "#FFFFFF" },
  { id: "USD_0_70", label: "$0.70 USDT", color: "#FF007F", textColor: "#FFFFFF" },
  { id: "USD_1_00", label: "$1.00 USDT", color: "#FFB703", textColor: "#07090E" },
  { id: "FREE_SPIN", label: "FREE SPIN", color: "#3B82F6", textColor: "#FFFFFF" },
  { id: "TRY_YOUR_LUCK", label: "TRY AGAIN", color: "#1E293B", textColor: "#94A3B8" },
];

export function SpinWheel() {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [availableSpins, setAvailableSpins] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [latestResult, setLatestResult] = useState<SpinResultData | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentSpins, setRecentSpins] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio API for synthetic sound effects (zero external audio files needed)
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  const playFanfareSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {}
  };

  const fetchUserData = () => {
    if (!address) return;
    fetch(`/api/user?wallet=${address}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.availableSpins === "number") {
          setAvailableSpins(data.availableSpins);
        }
        if (data && Array.isArray(data.recentSpins)) {
          setRecentSpins(data.recentSpins);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchUserData();
    }
  }, [isConnected, address]);

  const handleSpinClick = async () => {
    if (!isConnected || !address) {
      setErrorMessage("Please connect your Web3 wallet to spin.");
      return;
    }
    if (availableSpins <= 0) {
      setErrorMessage("No spin credits available. Stake an Agent Legends NFT to unlock spin credits!");
      return;
    }
    if (isSpinning) return;

    setErrorMessage(null);
    setIsSpinning(true);

    try {
      const requestId = crypto.randomUUID();
      const timestamp = Date.now();
      const signature = await signMessageAsync({
        account: address,
        message: createSpinMessage(address, timestamp, requestId),
      });

      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, requestId, timestamp, signature }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate spin");
      }

      const result: SpinResultData = data.spin;
      setAvailableSpins(data.remainingSpins);

      // 2. Find target sector index
      const sectorIndex = WHEEL_SECTORS.findIndex((s) => s.id === result.outcome);
      const sectorCount = WHEEL_SECTORS.length;
      const sectorAngle = 360 / sectorCount;

      // Pointer is fixed at top (0 degrees).
      // To have sectorIndex land under the top pointer:
      // target rotation = full rotations + (360 - (sectorIndex * sectorAngle + sectorAngle / 2))
      const extraFullSpins = 5;
      const targetSectorAngle = 360 - (sectorIndex * sectorAngle + sectorAngle / 2);
      const currentRotationMod = rotationAngle % 360;
      const additionalDegrees = extraFullSpins * 360 + (targetSectorAngle - currentRotationMod + 360) % 360;
      const finalAngle = rotationAngle + additionalDegrees;

      setRotationAngle(finalAngle);

      // Play tick sounds during spin duration
      let tickCount = 0;
      const tickInterval = setInterval(() => {
        tickCount++;
        playTickSound();
        if (tickCount > 35) clearInterval(tickInterval);
      }, 110);

      // 3. Conclude animation after 4.2 seconds
      setTimeout(() => {
        clearInterval(tickInterval);
        setIsSpinning(false);
        setLatestResult(result);
        setResultModalOpen(true);

        if (result.isWinner || result.isFreeSpinAwarded) {
          playFanfareSound();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#00FF66", "#00E5FF", "#9D4EDD", "#FFB703"],
          });
        }

        fetchUserData();
      }, 4200);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setIsSpinning(false);
      setErrorMessage(errorMsg);
    }
  };

  const numSectors = WHEEL_SECTORS.length;
  const sliceAngle = 360 / numSectors;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Reward information */}
      <div className="w-full max-w-2xl mb-8 p-3 rounded-xl bg-slate-900/80 border border-[#00FF66]/20 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <span>
            Results use server-side randomness, not VRF. Spin use is recorded in the app ledger; USDT payouts update after an on-chain transfer is verified.
          </span>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 ml-2"
          title={soundEnabled ? "Disable Sound Effects" : "Enable Sound Effects"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00FF66]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {errorMessage && (
        <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Cyber Prize Wheel Container */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] flex items-center justify-center my-6">
        {/* Pointer Arrow at Top (Fixed) */}
        <div className="absolute -top-4 z-30 flex flex-col items-center">
          <div className="w-8 h-9 bg-gradient-to-b from-[#00FF66] to-[#00CC52] clip-path-pointer shadow-neon-green flex items-center justify-center rounded-t-sm" />
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-[#00FF66] filter drop-shadow-[0_4px_8px_rgba(0,255,102,0.8)]" />
        </div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-[#00FF66]/30 shadow-neon-green animate-pulse-slow pointer-events-none" />

        {/* Rotating SVG Wheel */}
        <div
          className="w-full h-full rounded-full transition-transform ease-out"
          style={{
            transform: `rotate(${rotationAngle}deg)`,
            transitionDuration: isSpinning ? "4.2s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.12, 0.8, 0.15, 1)",
          }}
        >
          <svg viewBox="0 0 400 400" className="w-full h-full transform -rotate-90">
            <defs>
              <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {WHEEL_SECTORS.map((sector, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = (index + 1) * sliceAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 200 + 190 * Math.cos(startRad);
              const y1 = 200 + 190 * Math.sin(startRad);
              const x2 = 200 + 190 * Math.cos(endRad);
              const y2 = 200 + 190 * Math.sin(endRad);

              const pathData = `M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`;
              const midAngle = startAngle + sliceAngle / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textX = 200 + 125 * Math.cos(midRad);
              const textY = 200 + 125 * Math.sin(midRad);

              return (
                <g key={sector.id}>
                  <path
                    d={pathData}
                    fill={sector.color}
                    stroke="#07090E"
                    strokeWidth="3"
                    className="transition-colors"
                  />
                  {/* Label Text */}
                  <text
                    x={textX}
                    y={textY}
                    fill={sector.textColor}
                    fontSize="13"
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                  >
                    {sector.label}
                  </text>
                </g>
              );
            })}

            {/* Inner Center Hub Shadow */}
            <circle cx="200" cy="200" r="48" fill="#07090E" stroke="#00FF66" strokeWidth="4" />
          </svg>
        </div>

        {/* Center Spin Trigger Button */}
        <button
          onClick={handleSpinClick}
          disabled={isSpinning}
          className={`absolute z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center p-2 text-center transition-all ${
            isSpinning
              ? "bg-slate-900 cursor-not-allowed opacity-80"
              : availableSpins > 0
              ? "bg-gradient-to-br from-[#00FF66] to-[#00CC52] text-[#07090E] hover:scale-105 shadow-neon-green cursor-pointer font-black"
              : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-[#00FF66]/30"
          }`}
        >
          <Disc3 className={`w-6 h-6 mb-0.5 ${isSpinning ? "animate-spin text-[#00FF66]" : ""}`} />
          <span className="text-[11px] font-black uppercase tracking-wider font-mono">
            {isSpinning ? "ROLLING..." : "SPIN NOW"}
          </span>
          <span className="text-[10px] font-mono tracking-tight opacity-90">
            {availableSpins} CREDITS
          </span>
        </button>
      </div>

      {/* Available rewards */}
      <div className="w-full max-w-3xl mt-8 glass-panel p-5 rounded-2xl">
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold mb-3 flex items-center space-x-2">
          <Disc3 className="w-4 h-4 text-[#00FF66]" />
          <span>Rewards on the wheel</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {WHEEL_SECTORS.map((s) => (
            <div
              key={s.id}
              className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center text-center space-y-1"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs font-bold text-white font-mono">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 font-mono mt-3">
          One initial spin is granted per successfully staked NFT. Free spin outcomes add a spin credit. Track USDT prizes and payout status on the Rewards page.
        </p>
      </div>

      {/* Result Modal */}
      {resultModalOpen && latestResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-md w-full border border-[#00FF66]/40 shadow-neon-green relative animate-float">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#00FF66]/20 border border-[#00FF66]/50 flex items-center justify-center text-[#00FF66]">
                {latestResult.isWinner ? (
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                ) : (
                  <Disc3 className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#00E5FF]">
                  SPIN OUTCOME RESOLVED
                </span>
                <h2 className="text-3xl font-black text-white font-mono tracking-tight mt-1">
                  {latestResult.label}
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Spin Reference ID:</span>
                  <span className="text-slate-200">{latestResult.spinId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Payout Status:</span>
                  <span className="flex items-center space-x-1 text-amber-300">
                    <Clock className="w-3 h-3" />
                    <span>{latestResult.requiresPayout ? "Transfer Pending" : "Completed"}</span>
                  </span>
                </div>
              </div>

              {latestResult.requiresPayout && (
                <p className="text-[11px] text-amber-200 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  Your ${latestResult.rewardAmountUsdt.toFixed(2)} USDT prize is awaiting processing. Check the Rewards page for status updates.
                </p>
              )}

              <button
                onClick={() => setResultModalOpen(false)}
                className="w-full py-3 rounded-xl bg-[#00FF66] text-[#07090E] font-bold font-mono tracking-wider hover:bg-[#00CC52] transition-colors shadow-neon-green"
              >
                ACKNOWLEDGE & CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Spin History Table */}
      {recentSpins.length > 0 && (
        <div className="w-full max-w-3xl mt-10 glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold mb-4 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#00E5FF]" />
              <span>Your Recent Spin History</span>
            </span>
            <span className="text-xs text-slate-500 font-normal">Last {recentSpins.length} spins</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Spin ID</th>
                  <th className="pb-2">Outcome</th>
                  <th className="pb-2">Reward</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentSpins.map((s, idx) => (
                  <tr key={s.spinId || idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 text-slate-300">{s.spinId}</td>
                    <td className="py-2.5 text-white font-bold">{s.label || s.outcome}</td>
                    <td className="py-2.5 text-[#00FF66]">
                      {s.rewardAmountUsdt > 0 ? `$${s.rewardAmountUsdt.toFixed(2)} USDT` : s.isFreeSpinAwarded ? "1 Free Spin" : "-"}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.payoutStatus === "PAID"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : s.payoutStatus === "PENDING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {s.payoutStatus || "NONE"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
