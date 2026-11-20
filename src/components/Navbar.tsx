"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  Award,
  Crown,
  FileText,
  LayoutDashboard,
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
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/leaderboard", label: "Ranks", icon: Crown },
  { href: "/docs", label: "Docs", icon: FileText },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>

        <button
          type="button"
          className="site-mobile-toggle"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="site-mobile-drawer">
          <div className="site-mobile-links">{renderLinks(true)}</div>
          <div className="site-mobile-actions">
            <a
              href="https://x.com/agent_legends"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-700/60 text-xs font-medium"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Follow @agent_legends</span>
            </a>
            <ConnectButton />
          </div>
        </div>
      )}
    </nav>
  );
}
