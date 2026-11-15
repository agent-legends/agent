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
            <p className="flex items-center gap-2 font-semibold text-slate-800">
              <Shield className="h-5 w-5 text-[#00FF66]" aria-hidden="true" />
              Agent Legends 2.0
            </p>
            <p className="mt-2">
              A BNB Smart Chain collection with staking, spin rewards, and
              community referrals.
            </p>
          </section>

          <section>
            <h2>Explore</h2>
            <ul>
              <li><Link href="/mint">Mint an NFT</Link></li>
              <li><Link href="/my-nfts">My collection</Link></li>
              <li><Link href="/staking">Staking</Link></li>
              <li><Link href="/spin">Spin rewards</Link></li>
              <li><Link href="/referrals">Referrals</Link></li>
            </ul>
          </section>

          <section>
            <h2>Protocol rules</h2>
            <ul>
              <li>10,000 NFT maximum supply</li>
              <li>$0.20 USD mint price, converted to BNB</li>
              <li>72-hour staking lock</li>
              <li>3 successful referrals unlock 1 free NFT</li>
              <li>USDT payouts are manually verified</li>
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
