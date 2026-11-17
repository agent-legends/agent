import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Disc3,
  LockKeyhole,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { StatsHeader } from "@/components/StatsHeader";

const features = [
  {
    href: "/mint",
    icon: Sparkles,
    title: "Mint your legend",
    description:
      "The NFT mint is free. A $0.10 platform fee per NFT is payable in BNB, plus network gas.",
    action: "Open mint",
  },
  {
    href: "/staking",
    icon: LockKeyhole,
    title: "Stake for spin credits",
    description:
      "Stake an eligible NFT for at least 72 hours. Its first successful stake grants one initial spin credit.",
    action: "View staking",
  },
  {
    href: "/spin",
    icon: Disc3,
    title: "Use your spins",
    description:
      "Review the disclosed reward odds, spin result, and manual USDT payout status.",
    action: "Open the wheel",
  },
  {
    href: "/referrals",
    icon: Users,
    title: "Grow your network",
    description:
      "Three successful referrals unlock one free NFT, subject to eligibility and collection supply.",
    action: "Get your referral link",
  },
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            <Shield aria-hidden="true" />
            The next era of Web3 identity
          </p>
          <h1>
            YOUR LEGEND
            <br />
            BEGINS <span>HERE.</span>
          </h1>
          <p>
            Enter the world of Agent Legends. Mint your NFT, stake your identity,
            earn spin opportunities, and join the next generation of AI-powered Web3.
          </p>

          <div className="home-actions">
            <Link href="/mint" className="home-button home-button-primary">
              <Sparkles aria-hidden="true" />
              Mint your NFT
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/explore" className="home-button home-button-secondary">
              Explore collection
            </Link>
          </div>

          <ul className="home-hero-points">
            <li><CheckCircle2 aria-hidden="true" /> Free NFT mint</li>
            <li><CheckCircle2 aria-hidden="true" /> $0.10 platform fee per NFT + gas</li>
            <li><CheckCircle2 aria-hidden="true" /> 72-hour staking lock</li>
          </ul>
        </div>

        <aside className="home-protocol-card" aria-label="Agent Legends platform overview">
          <div className="home-artwork" aria-hidden="true">
            <span className="home-artwork-orbit home-artwork-orbit-one" />
            <span className="home-artwork-orbit home-artwork-orbit-two" />
            <span className="home-artwork-core"><Shield /></span>
            <span className="home-artwork-caption">AGENT LEGENDS · BNB 56</span>
          </div>
          <span>Agent Legends protocol</span>
          <h2>Own your identity. Enter the arena.</h2>
          <div className="home-process">
            <div className="home-process-item">
              <span className="home-process-icon"><Sparkles aria-hidden="true" /></span>
              <div>
                <strong>01 · Mint</strong>
                <p>Mint free. The contract quotes a $0.10-per-NFT platform fee in BNB.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><LockKeyhole aria-hidden="true" /></span>
              <div>
                <strong>02 · Stake</strong>
                <p>Stake an NFT for 72 hours and get one initial spin credit on first stake.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><Award aria-hidden="true" /></span>
              <div>
                <strong>03 · Participate</strong>
                <p>Invite friends and track spin results and manually processed rewards.</p>
              </div>
            </div>
          </div>
          <p className="home-fee-note">
            Minting is free. The platform fee is separate from gas and is not an NFT purchase price.
          </p>
        </aside>
      </section>

      <StatsHeader />

      <section aria-labelledby="features-heading">
        <div className="home-section-heading">
          <span>Explore the platform</span>
          <h2 id="features-heading">Everything in one place.</h2>
          <p>
            Manage your collection and follow each platform flow from a single
            dashboard.
          </p>
        </div>
        <div className="home-feature-grid">
          {features.map(({ href, icon: Icon, title, description, action }) => (
            <Link key={href} href={href} className="home-feature-card">
              <span className="home-feature-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="home-feature-link">
                {action}
                <ArrowRight aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
