import React from "react";
import Link from "next/link";
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const testnetNft = CONTRACT_ADDRESSES[97].nft;
  const testnetStaking = CONTRACT_ADDRESSES[97].staking;
  const testnetUsdt = CONTRACT_ADDRESSES[97].usdt;

  return (
    <footer className="w-full border-t border-[#00FF66]/20 bg-[#05070A] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Transparency & Centralized Randomness Disclosure Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-amber-300">
              System Architecture & Randomness Transparency Disclosure:
            </p>
            <p className="text-slate-300">
              Agent Legends 2.0 utilizes a server-side cryptographically secure pseudo-random number generator (CSPRNG)
              for all prize-wheel outcomes. Results are calculated on the backend and are{" "}
              <strong className="text-amber-200">not independently verifiable on-chain Chainlink VRF results</strong>. Winning USDT
              rewards are audited and manually dispatched by platform administrators with real-time on-chain transaction hash verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-[#00FF66]" />
              <span className="text-lg font-black tracking-wider text-white">
                AGENT LEGENDS <span className="text-[#00FF66]">2.0</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cyberpunk tactical NFT minting, 72-hour staking custody, and spin-to-earn platform powered by BNB Smart Chain.
            </p>
            <div className="flex items-center space-x-2 pt-2 text-xs font-mono text-[#00E5FF]">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
              <span>BNB Smart Chain Active</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/mint" className="hover:text-[#00FF66] transition-colors">
                  Mint Tactical Agent
                </Link>
              </li>
              <li>
                <Link href="/staking" className="hover:text-[#00FF66] transition-colors">
                  NFT Staking (72h Lock)
                </Link>
              </li>
              <li>
                <Link href="/spin" className="hover:text-[#00FF66] transition-colors">
                  Spin & Earn Wheel
                </Link>
              </li>
              <li>
                <Link href="/referrals" className="hover:text-[#00FF66] transition-colors">
                  Referral Rewards (3 = 1 Free NFT)
                </Link>
              </li>
              <li>
                <Link href="/rewards" className="hover:text-[#00FF66] transition-colors">
                  USDT Reward Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Contract Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold mb-3">
              Contracts (BSC Testnet)
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <a
                  href={`https://testnet.bscscan.com/address/${testnetNft}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-[#00FF66] transition-colors"
                >
                  <span>NFT: {testnetNft.slice(0, 6)}...{testnetNft.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href={`https://testnet.bscscan.com/address/${testnetStaking}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-[#00FF66] transition-colors"
                >
                  <span>Staking: {testnetStaking.slice(0, 6)}...{testnetStaking.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href={`https://testnet.bscscan.com/address/${testnetUsdt}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 hover:text-[#00FF66] transition-colors"
                >
                  <span>USDT: {testnetUsdt.slice(0, 6)}...{testnetUsdt.slice(-4)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Governance & Rules */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-200 font-bold mb-3">
              Core Protocol Rules
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>• Max Collection Cap: 10,000 NFTs</li>
              <li>• Mint Cost: $0.20 USD via Chainlink BNB Feed</li>
              <li>• Initial Spin: 1 per first-time staked NFT</li>
              <li>• Restake: No duplicate spin credits</li>
              <li>• Staking Lock: Strict 72-hour custody</li>
              <li>• Payouts: Verified BSC USDT transfers</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {currentYear} Agent Legends 2.0. All tactical rights reserved.</p>
          <div className="flex items-center space-x-6 text-slate-400">
            <Link href="/docs" className="hover:text-slate-300">Whitepaper & Specs</Link>
            <Link href="/admin" className="hover:text-[#C77DFF]">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

