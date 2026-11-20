import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <section>
            <h2>Agent Legends</h2>
            <div className="flex items-center gap-3 font-semibold text-slate-100">
              <img
                src="/agent-legends-logo.jpg"
                alt="Agent Legends"
                className="w-8 h-8 rounded-lg object-cover border border-sky-400/40"
              />
              <span>Agent Legends 2.0</span>
            </div>
            <p className="mt-2 text-slate-400 text-sm">
              The next generation of AI Web3 identity on BNB Smart Chain.
              Agentic wallet minting, on-chain verification, and community referrals.
            </p>
            <div className="mt-4">
              <a
                href="https://x.com/agent_legends"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700/80 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Follow on X @agent_legends
              </a>
            </div>
          </section>

          <section>
            <h2>Explore</h2>
            <ul>
              <li><Link href="/mint">Mint an NFT</Link></li>
              <li><Link href="/my-nfts">My collection</Link></li>
              <li><Link href="/referrals">Referrals</Link></li>
              <li><Link href="/leaderboard">Leaderboard</Link></li>
              <li><Link href="/docs">Documentation</Link></li>
            </ul>
          </section>

          <section>
            <h2>Protocol rules</h2>
            <ul>
              <li>2,000 NFT maximum collection supply</li>
              <li>1 Free Mint for verified Agentic Wallets</li>
              <li>Paid mint: 0.0005 BNB each (up to 9 per wallet)</li>
              <li>Maximum 10 NFTs total per wallet</li>
              <li>1,000 free mints reserved for Binance Agent ID holders</li>
            </ul>
          </section>
        </div>

        <div className="site-footer-bottom">
          <p>© {currentYear} Agent Legends. All rights reserved.</p>
          <nav className="site-footer-bottom-links" aria-label="Footer navigation">
            <Link href="/docs">Documentation</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
