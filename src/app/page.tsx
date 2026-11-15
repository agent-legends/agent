import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Disc3,
  Gift,
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
    title: "Mint your agent",
    description:
      "Mint up to 20 NFTs per transaction. BNB pricing is calculated from the on-chain Chainlink feed.",
    action: "Explore minting",
  },
  {
    href: "/staking",
    icon: LockKeyhole,
    title: "Stake for spin credits",
    description:
      "Stake your NFTs in the 72-hour vault. Each token grants one initial spin on its first stake.",
    action: "View staking",
  },
  {
    href: "/spin",
    icon: Disc3,
    title: "Use your spins",
    description:
      "See the published prize probabilities and review each spin in your account history.",
    action: "Open the wheel",
  },
  {
    href: "/referrals",
    icon: Users,
    title: "Grow your network",
    description:
      "Every three successful referred wallets unlock one free NFT. Milestones accumulate.",
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
            Agent Legends on BNB Smart Chain
          </p>
          <h1>
            Collect.
            <br />
            Stake.
            <br />
            <span>Earn.</span>
          </h1>
          <p>
            Build your Agent Legends collection, stake NFTs for spin credits,
            and track rewards with clear rules at every step.
          </p>

          <div className="home-actions">
            <Link href="/mint" className="home-button home-button-primary">
              <Sparkles aria-hidden="true" />
              Explore the collection
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/docs" className="home-button home-button-secondary">
              How it works
            </Link>
          </div>

          <ul className="home-hero-points">
            <li><CheckCircle2 aria-hidden="true" /> $0.20 USD mint price</li>
            <li><CheckCircle2 aria-hidden="true" /> 72-hour staking lock</li>
            <li><CheckCircle2 aria-hidden="true" /> On-chain payout verification</li>
          </ul>
        </div>

        <aside className="home-protocol-card" aria-label="How the platform works">
          <span>A straightforward path</span>
          <h2>One collection. Three steps.</h2>
          <div className="home-process">
            <div className="home-process-item">
              <span className="home-process-icon"><Sparkles aria-hidden="true" /></span>
              <div>
                <strong>01 · Mint</strong>
                <p>Pay the USD-denominated price in BNB, calculated by the contract oracle.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><LockKeyhole aria-hidden="true" /></span>
              <div>
                <strong>02 · Stake</strong>
                <p>Lock your NFT for 72 hours and receive its initial spin credit once.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><Award aria-hidden="true" /></span>
              <div>
                <strong>03 · Participate</strong>
                <p>Use spin credits, invite friends, and follow reward payout status.</p>
              </div>
            </div>
          </div>
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

      <section className="home-transparency" aria-labelledby="transparency-heading">
        <AlertTriangle aria-hidden="true" />
        <div>
          <h2 id="transparency-heading">Know how rewards work</h2>
          <p>
            Spin outcomes use server-side randomness and are not independently
            verifiable VRF results. USDT prizes are dispatched manually; a
            payout is marked paid only after its BNB Chain transfer is verified.
          </p>
          <Link href="/rewards" className="home-feature-link">
            View your rewards <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
