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
  { href: "/admin", label: "Admin", icon: Shield },
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
          <span className="site-brand-mark">
            <Shield aria-hidden="true" />
          </span>
          <span>
            <span className="site-brand-name">Agent Legends</span>
            <span className="site-brand-caption">BNB Smart Chain</span>
          </span>
        </Link>

        <div className="site-nav-links">{renderLinks()}</div>

        <div className="site-nav-actions site-desktop-actions">
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
        </div>
      )}
    </nav>
  );
}
