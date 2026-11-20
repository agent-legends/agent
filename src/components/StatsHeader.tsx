"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Flame, ShieldCheck, Sparkles, Zap, Award, Coins } from "lucide-react";
import {
  CONTRACT_ADDRESSES,
  MAX_SUPPLY,
  MAX_FREE_SUPPLY,
  MAX_SHARES,
  START_SHARE_PRICE_USDT,
} from "@/config/contracts";
import { NFT_ABI } from "@/config/abis/nft";
import { SHARE_MINT_ABI } from "@/config/abis/shareMint";

export function StatsHeader() {
  const config = CONTRACT_ADDRESSES[56];

  // NFT stats from contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912
  const { data: nftTotalSupply } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "totalSupply",
    chainId: 56,
  });

  const { data: nftRemainingFree } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "remainingFreeSupply",
    chainId: 56,
  });

  // Share Mint stats from contract 0x0E918a36bEcAF6dF057bf206C5642D50045BBF35
  const { data: totalSharesSold } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "totalSharesSold",
    chainId: 56,
  });

  const { data: currentSharePrice } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "getCurrentSharePrice",
    chainId: 56,
  });

  const { data: liquidityUSDTReserve } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityUSDTReserve",
    chainId: 56,
  });

  const totalMinted = nftTotalSupply !== undefined ? Number(nftTotalSupply) : 4;
  const remainingFree = nftRemainingFree !== undefined ? Number(nftRemainingFree) : 996;
  const freeClaimed = Math.max(0, MAX_FREE_SUPPLY - remainingFree);
  const sharesSold = totalSharesSold !== undefined ? Number(totalSharesSold) : 0;
  const sharePrice = currentSharePrice
    ? parseFloat(formatUnits(currentSharePrice, 18)).toFixed(4)
    : START_SHARE_PRICE_USDT.toFixed(4);
  const lpUsdt = liquidityUSDTReserve
    ? parseFloat(formatUnits(liquidityUSDTReserve, 18)).toFixed(2)
    : "0.00";

  const cards = [
    {
      icon: Sparkles,
      label: "NFT Minted Supply",
      value: `${totalMinted.toLocaleString()} / ${MAX_SUPPLY.toLocaleString()}`,
      detail: `${Math.max(0, MAX_SUPPLY - totalMinted).toLocaleString()} remaining`,
      accent: "text-sky-300",
    },
    {
      icon: ShieldCheck,
      label: "Agent ID (.ai) Free Claim",
      value: "FREE",
      detail: `${freeClaimed} / 1,000 claimed`,
      accent: "text-emerald-300",
    },
    {
      icon: Zap,
      label: "Public Paid NFT Mint",
      value: "0.0005 BNB",
      detail: "Up to 10 NFTs / wallet",
      accent: "text-violet-300",
    },
    {
      icon: Coins,
      label: "Bonding Curve Shares",
      value: `${sharesSold.toLocaleString()} / ${MAX_SHARES.toLocaleString()}`,
      detail: "1 Share = 4,500 $LEGENDS",
      accent: "text-purple-300",
    },
    {
      icon: Award,
      label: "Live Share Price",
      value: `$${sharePrice} USDT`,
      detail: "+0.0001 USDT per share",
      accent: "text-cyan-300",
    },
    {
      icon: Flame,
      label: "LP Launch Reserve",
      value: `$${lpUsdt} USDT`,
      detail: "Launches PancakeSwap at 10k shares",
      accent: "text-amber-300",
    },
  ];

  return (
    <section className="stats-header" aria-labelledby="stats-header-title">
      <div className="stats-header-inner">
        <div className="stats-header-top">
          <div>
            <span className="stats-header-kicker">BNB Smart Chain (Chain ID: 56)</span>
            <h2 id="stats-header-title" className="stats-header-heading">
              Live Protocol Metrics
            </h2>
          </div>
          <span className="stats-header-badge">
            <span className="stats-header-dot" aria-hidden="true" />
            Direct On-Chain Reads
          </span>
        </div>

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
