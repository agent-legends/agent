"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Award,
  Crown,
  Disc3,
  FileText,
  LayoutDashboard,
  Lock,
  Menu,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home", icon: Shield },
  { href: "/mint", label: "Mint", icon: Sparkles },
  { href: "/my-nfts", label: "My NFTs", icon: LayoutDashboard },
  { href: "/staking", label: "Staking", icon: Lock },
  { href: "/spin", label: "Spin", icon: Disc3 },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/rewards", label: "Rewards", icon: Award },
  { href: "/leaderboard", label: "Ranks", icon: Crown },
  { href: "/docs", label: "Docs", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availableSpins, setAvailableSpins] = useState<number | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isConnected || !address) {
      setAvailableSpins(null);
      return;
    }

    fetch(`/api/user?wallet=${address}`)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data?.availableSpins === "number") {
          setAvailableSpins(data.availableSpins);
        }
      })
      .catch(() => setAvailableSpins(null));
  }, [isConnected, address]);

  const renderLinks = (mobile = false) =>
    navLinks.map(({ href, label, icon: Icon }) => {
      const isActive = pathname === href;
      return (
        <Link
          key={href}
          href={href}
          className="site-nav-link"
          aria-current={isActive ? "page" : undefined}
          onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      );
    });

  return (
    <nav className="site-navbar" aria-label="Main navigation">
      <div className="site-nav-inner">
        <Link href="/" className="site-brand" aria-label="Agent Legends home">
          <img
            src="/agent-legends-logo.jpg"
            alt="Agent Legends Logo"
            className="w-10 h-10 rounded-xl object-cover shadow-md shadow-sky-500/20 border border-sky-400/30"
          />
          <span>
            <span className="site-brand-name">Agent Legends</span>
            <span className="site-brand-caption">BNB Smart Chain</span>
          </span>
        </Link>

        <div className="site-nav-links">{renderLinks()}</div>

        <div className="site-nav-actions site-desktop-actions">
          <a
            href="https://x.com/agent_legends"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs font-medium"
            title="Follow @agent_legends on X"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>@agent_legends</span>
          </a>
          {isConnected && availableSpins !== null && (
            <Link href="/spin" className="site-spin-credit">
              <Disc3 aria-hidden="true" />
              <span>{availableSpins} spins</span>
            </Link>
          )}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>

        <div className="site-mobile-actions">
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus="avatar"
          />
          <button
            type="button"
            className="site-menu-button"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="site-mobile-menu" id="mobile-navigation">
          {isConnected && availableSpins !== null && (
            <Link href="/spin" className="site-spin-credit">
              <Disc3 aria-hidden="true" />
              <span>{availableSpins} available spins</span>
            </Link>
          )}
          {renderLinks(true)}
          <a
            href="https://x.com/agent_legends"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-slate-300 hover:text-white border-t border-slate-800 text-sm font-medium"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>Follow @agent_legends</span>
          </a>
        </div>
      )}
    </nav>
  );
}
