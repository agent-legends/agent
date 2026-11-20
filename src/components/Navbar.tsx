"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  Bot,
  Coins,
  Crown,
  ExternalLink,
  FileCode2,
  FileText,
  Flame,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { SHARE_MINT_ABI } from "@/config/abis/shareMint";
import { NFT_ABI } from "@/config/abis/nft";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Live on-chain badges
  const { data: totalSharesSold } = useReadContract({
    address: CONTRACT_ADDRESSES[56].shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "totalSharesSold",
    chainId: 56,
  });

  const { data: currentSharePrice } = useReadContract({
    address: CONTRACT_ADDRESSES[56].shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "getCurrentSharePrice",
    chainId: 56,
  });

  const { data: nftTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES[56].nft,
    abi: NFT_ABI,
    functionName: "totalSupply",
    chainId: 56,
  });

  const formattedSharePrice = currentSharePrice
    ? parseFloat(formatUnits(currentSharePrice, 18)).toFixed(4)
    : "0.5000";

  const sharesDisplay = totalSharesSold !== undefined ? Number(totalSharesSold).toLocaleString() : "0";
  const nftDisplay = nftTotalSupply !== undefined ? Number(nftTotalSupply).toLocaleString() : "4";

  return (
    <nav className="site-navbar border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50" aria-label="Main navigation">
      <div className="site-nav-inner max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="site-brand flex items-center gap-2.5 group" aria-label="Agent Legends Terminal">
          <img
            src="/agent-legends-logo.jpg"
            alt="Agent Legends Logo"
            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-sky-500/20 border border-sky-400/30 group-hover:border-sky-400 transition-colors"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm text-white tracking-wider font-mono">
              AGENT LEGENDS <span className="text-sky-400">· BSC</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight">
              Mint & Share Terminal
            </span>
          </div>
        </Link>

        {/* Live Badges (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
          {/* Shares Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-violet-500/30 text-slate-300">
            <Coins className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-400">Shares:</span>
            <span className="text-white font-bold">{sharesDisplay} / 100,000</span>
            <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px]">
              ${formattedSharePrice} USDT
            </span>
          </div>

          {/* NFT Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-emerald-500/30 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">NFTs:</span>
            <span className="text-white font-bold">{nftDisplay} / 2,000</span>
          </div>
        </div>

        {/* Navigation & Action Links */}
        <div className="hidden md:flex items-center gap-3">
          {/* AI Agent Guide link */}
          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 text-sky-400 border border-sky-500/30 text-xs font-mono font-bold transition-all shadow-sm shadow-sky-500/10"
            title="Read machine-readable AI agent guide"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Agent Guide</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>

          {/* X Community Link */}
          <a
            href="https://x.com/agent_legends"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs font-mono"
            title="Official X / Twitter"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@agent_legends</span>
          </a>

          {/* Connect Button */}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3 font-mono text-xs">
          <div className="flex flex-col gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-slate-300">
              <span className="text-slate-400">Shares Minted:</span>
              <span className="font-bold text-white">{sharesDisplay} / 100,000 (${formattedSharePrice})</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-slate-300">
              <span className="text-slate-400">NFTs Minted:</span>
              <span className="font-bold text-white">{nftDisplay} / 2,000</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-500/30 font-bold"
            >
              <Bot className="w-4 h-4" />
              <span>AI Agent Guide (/llms.txt)</span>
            </a>
            <a
              href="https://x.com/agent_legends"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800"
            >
              <span>Follow @agent_legends on X</span>
            </a>
          </div>

          <div className="pt-2">
            <ConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
}
