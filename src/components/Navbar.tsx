"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import {
  Bot,
  Coins,
  Crown,
  ExternalLink,
  Flame,
  Menu,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { SHARE_MINT_ABI } from "@/config/abis/shareMint";
import { NFT_ABI } from "@/config/abis/nft";

export function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const config = CONTRACT_ADDRESSES[56];

  // Live on-chain badges
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

  const { data: nftTotalSupply } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "totalSupply",
    chainId: 56,
  });

  const { data: nftBalance } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const isSuperAmbassador = (nftBalance !== undefined && Number(nftBalance) > 0);

  const formattedSharePrice = currentSharePrice
    ? parseFloat(formatUnits(currentSharePrice, 18)).toFixed(4)
    : "0.5000";

  const sharesDisplay = totalSharesSold !== undefined ? Number(totalSharesSold).toLocaleString() : "0";
  const nftDisplay = nftTotalSupply !== undefined ? Number(nftTotalSupply).toLocaleString() : "4";

  return (
    <header className="sticky top-0 z-50 flex flex-col font-mono text-xs">
      {/* jager.live Announcement Ticker Bar */}
      <div className="bg-[#0b0f19] border-b border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              BNB SMART CHAIN · AGENT ID (.ai)
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">
              BUILD ON BINANCE · AGENT LEGENDS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">
              Invitee mints 10 shares in 1 go → You get 10-15% USDT, they get 5% cashback
            </span>
            <Link
              href="/referrals"
              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30 transition-colors"
            >
              Syndicate →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <nav className="border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Agent Legends Terminal">
            <img
              src="/agent-legends-logo.jpg"
              alt="Agent Legends Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-md shadow-sky-500/20 border border-sky-400/40 group-hover:border-sky-400 transition-colors"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-white tracking-wider">
                  $LEGENDS
                </span>
                {/* Ambassador Badge */}
                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  isSuperAmbassador
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                    : "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                }`}>
                  {isSuperAmbassador ? "👑 Super Ambassador (15%)" : "Ambassador (10%)"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-tight">
                Mint & Share Terminal · BSC
              </span>
            </div>
          </Link>

          {/* Live Badges (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
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

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/docs"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              Whitepaper
            </Link>

            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/70 text-sky-400 border border-sky-500/30 font-bold transition-all"
              title="AI Agent Guide"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Pro Guide</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>

            <Link
              href="/referrals"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 font-bold transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Invite & Earn USDT</span>
            </Link>

            <a
              href="https://x.com/agent_legends"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
              title="Official X"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>@agent_legends</span>
            </a>

            {/* Standard Injected EVM Wallet Connect Button */}
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
          <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
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
              <Link
                href="/docs"
                className="py-2.5 px-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800"
              >
                Whitepaper / Protocol Docs
              </Link>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-500/30 font-bold"
              >
                <Bot className="w-4 h-4" />
                <span>AI Pro Guide (/llms.txt)</span>
              </a>
              <Link
                href="/referrals"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold"
              >
                <Trophy className="w-4 h-4" />
                <span>Invite & Earn USDT</span>
              </Link>
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
    </header>
  );
}
