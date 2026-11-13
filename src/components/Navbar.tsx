"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Shield, Sparkles, Menu, X, Disc3, Award, Users, FileText, Lock, LayoutDashboard, Crown } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availableSpins, setAvailableSpins] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetch(`/api/user?wallet=${address}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.availableSpins === "number") {
            setAvailableSpins(data.availableSpins);
          }
        })
        .catch(() => {});
    } else {
      setAvailableSpins(null);
    }
  }, [isConnected, address]);

  const navLinks = [
    { href: "/", label: "Home", icon: Shield },
    { href: "/mint", label: "Mint NFT", icon: Sparkles },
    { href: "/my-nfts", label: "My NFTs", icon: LayoutDashboard },
    { href: "/staking", label: "Staking", icon: Lock },
    { href: "/spin", label: "Spin & Earn", icon: Disc3 },
    { href: "/referrals", label: "Referrals", icon: Users },
    { href: "/rewards", label: "Rewards", icon: Award },
    { href: "/leaderboard", label: "Leaderboard", icon: Crown },
    { href: "/docs", label: "Docs", icon: FileText },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-[#00FF66]/20 bg-[#07090E]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF66] to-[#00E5FF] p-[2px] transition-transform group-hover:scale-105 shadow-neon-green">
              <div className="w-full h-full bg-[#07090E] rounded-[10px] flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#00FF66] animate-pulse-slow" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-[#00FF66] bg-clip-text text-transparent">
                Agent Legends <span className="text-[#00FF66]">2.0</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#00E5FF] uppercase">
                BNB Smart Chain
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/30 shadow-neon-green"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00FF66]" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link
              href="/admin"
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide transition-all ${
                pathname === "/admin"
                  ? "text-[#C77DFF] bg-[#9D4EDD]/20 border border-[#9D4EDD]/40"
                  : "text-slate-400 hover:text-[#C77DFF] hover:bg-slate-800/40"
              }`}
            >
              <span>Admin</span>
            </Link>
          </div>

          {/* Right side: Spin Credits & Connect Wallet */}
          <div className="hidden md:flex items-center space-x-3">
            {isConnected && availableSpins !== null && (
              <Link
                href="/spin"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] text-xs font-mono font-bold hover:bg-[#00FF66]/25 transition-all shadow-neon-green"
              >
                <Disc3 className="w-4 h-4 animate-spin text-[#00FF66]" style={{ animationDuration: "6s" }} />
                <span>{availableSpins} SPINS</span>
              </Link>
            )}

            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
            />
          </div>

          {/* Mobile menu button */}
          <div className="flex xl:hidden items-center space-x-2">
            <ConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800 bg-[#07090E]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2">
          {isConnected && availableSpins !== null && (
            <div className="mb-3 p-3 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-between">
              <span className="text-xs text-slate-300 font-mono">Available Spin Credits:</span>
              <span className="text-sm font-bold text-[#00FF66] font-mono">{availableSpins} SPINS</span>
            </div>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive
                    ? "text-[#00FF66] bg-[#00FF66]/15 border border-[#00FF66]/30 font-bold"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#00FF66]" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-[#C77DFF] bg-[#9D4EDD]/10 border border-[#9D4EDD]/20"
          >
            <Shield className="w-5 h-5 text-[#C77DFF]" />
            <span>Admin Dashboard</span>
          </Link>
        </div>
      )}
    </nav>
  );
}

