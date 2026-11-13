"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther, isAddress } from "viem";
import { useSearchParams } from "next/navigation";
import { Sparkles, Shield, AlertCircle, CheckCircle2, ExternalLink, Users, ChevronUp, ChevronDown } from "lucide-react";
import { CONTRACT_ADDRESSES, AGENT_LEGENDS_NFT_ABI } from "@/config/contracts";

export function MintSection() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const searchParams = useSearchParams();

  const [quantity, setQuantity] = useState<number>(1);
  const [referrer, setReferrer] = useState<string>("");
  const [estimatedBnbCost, setEstimatedBnbCost] = useState<string>("0.00033");
  const [bnbPriceUsd] = useState<number>(605.5);
  const [referrerError, setReferrerError] = useState<string | null>(null);

  // Read referrer from URL if present
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam && isAddress(refParam)) {
      setReferrer(refParam);
    }
  }, [searchParams]);

  // Compute unit price in BNB for $0.20 USD
  const unitBnb = 0.20 / bnbPriceUsd; // ~0.00033 BNB
  const totalBnb = (unitBnb * quantity).toFixed(6);

  useEffect(() => {
    setEstimatedBnbCost(totalBnb);
  }, [quantity, totalBnb]);

  const activeContractConfig =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[97];

  const { data: hash, isPending: isMintPending, error: mintError, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleReferrerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setReferrer(val);
    if (val && !isAddress(val)) {
      setReferrerError("Invalid BSC wallet address format");
    } else if (address && val.toLowerCase() === address.toLowerCase()) {
      setReferrerError("Self-referrals are prohibited by smart contract");
    } else {
      setReferrerError(null);
    }
  };

  const handleMint = async () => {
    if (!isConnected) return;
    if (referrer && (!isAddress(referrer) || referrer.toLowerCase() === address?.toLowerCase())) {
      setReferrerError("Please enter a valid, non-self referrer address or leave empty.");
      return;
    }

    const effectiveReferrer = referrer && isAddress(referrer) ? (referrer as `0x${string}`) : "0x0000000000000000000000000000000000000000";
    const paymentWei = parseEther(totalBnb);

    (writeContract as any)({
      address: activeContractConfig.nft as `0x${string}`,
      abi: AGENT_LEGENDS_NFT_ABI,
      functionName: "mint",
      args: [BigInt(quantity), effectiveReferrer],
      value: paymentWei,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-panel p-6 sm:p-8 rounded-3xl border border-[#00FF66]/30 shadow-neon-green relative">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] text-xs font-mono font-bold tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>GENESIS RECRUITMENT</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-mono">
            Recruit Tactical Agents
          </h2>
          <p className="text-xs text-slate-400">
            Chainlink-verified dynamic mint price: $0.20 USD equivalent in BNB.
          </p>
        </div>

        {/* Quantity Selector */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-bold uppercase">Quantity (Max 20 / TX)</span>
            <span className="text-xs font-mono text-[#00FF66]">10,000 Max Supply</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center transition-colors"
                disabled={quantity <= 1 || isMintPending || isConfirming}
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <span className="w-12 text-center text-2xl font-black text-white font-mono">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center transition-colors"
                disabled={quantity >= 20 || isMintPending || isConfirming}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            {/* Quick buttons */}
            <div className="flex space-x-1.5">
              {[1, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuantity(num)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    quantity === num
                      ? "bg-[#00FF66] text-[#07090E] shadow-neon-green"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                  disabled={isMintPending || isConfirming}
                >
                  {num}X
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Referrer Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Referral Wallet (Optional)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">3 Referrals = 1 Free NFT</span>
          </label>
          <input
            type="text"
            value={referrer}
            onChange={handleReferrerChange}
            placeholder="0x..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00FF66]/50 transition-colors"
            disabled={isMintPending || isConfirming}
          />
          {referrerError && <p className="text-[11px] text-red-400 font-mono">{referrerError}</p>}
        </div>

        {/* Price Breakdown */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800/80 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Price per NFT:</span>
            <span className="text-white font-bold">$0.20 USD (≈ {unitBnb.toFixed(6)} BNB)</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Quantity:</span>
            <span className="text-white font-bold">{quantity} Operatives</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="text-slate-300 font-bold uppercase">Total Cost:</span>
            <div className="text-right">
              <span className="text-lg font-black text-[#00FF66]">{totalBnb} BNB</span>
              <span className="block text-[10px] text-slate-500 font-normal">
                (${(quantity * 0.20).toFixed(2)} USD)
              </span>
            </div>
          </div>
        </div>

        {/* Mint Button */}
        <button
          onClick={handleMint}
          disabled={!isConnected || isMintPending || isConfirming}
          className={`w-full py-4 rounded-2xl font-black font-mono tracking-wider uppercase text-sm transition-all flex items-center justify-center space-x-2 ${
            !isConnected
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : isMintPending || isConfirming
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
              : "bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-[#07090E] hover:scale-[1.02] shadow-neon-green"
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>
            {!isConnected
              ? "Connect Wallet to Mint"
              : isMintPending
              ? "Confirm in Wallet..."
              : isConfirming
              ? "Recruiting on BNB Chain..."
              : `Mint ${quantity} Agent${quantity > 1 ? "s" : ""} (${totalBnb} BNB)`}
          </span>
        </button>

        {/* Transaction Status Feedback */}
        {mintError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="break-all font-mono">
              {mintError.message.includes("InsufficientBnbPayment")
                ? "Transaction reverted: Insufficient BNB sent."
                : mintError.message.includes("ExceedsMaxSupply")
                ? "Sold out: Exceeds 10,000 maximum collection supply."
                : mintError.message.slice(0, 160)}
            </span>
          </div>
        )}

        {isConfirmed && hash && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Recruitment Confirmed on BNB Smart Chain!</span>
            </div>
            <p className="text-slate-300">
              Successfully minted {quantity} Agent Legends NFT{quantity > 1 ? "s" : ""}. You can stake your operatives immediately to generate spin credits!
            </p>
            <a
              href={`${activeContractConfig.explorer}/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[#00FF66] hover:underline font-mono text-[11px]"
            >
              <span>View on BSCScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

