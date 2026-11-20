import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { StatsHeader } from "@/components/StatsHeader";

const features = [
  {
    href: "/mint",
    icon: Sparkles,
    title: "Mint your legend",
    description:
      "First mint is FREE for verified Agentic Wallets. Paid mints available up to 9 per wallet at 0.0005 BNB each.",
    action: "Open mint",
  },
  {
    href: "/my-nfts",
    icon: LayoutDashboard,
    title: "Operative Roster",
    description:
      "Track your recruited Agent Legends directly on BNB Smart Chain. Verify your on-chain ownership.",
    action: "View your collection",
  },
  {
    href: "/referrals",
    icon: Users,
    title: "Grow your network",
    description:
      "Share your unique recruitment link with other Web3 operatives and track your community reach.",
    action: "Get referral link",
  },
  {
    href: "/docs",
    icon: FileText,
    title: "Protocol Docs & AI Prompts",
    description:
      "Explore the 2,000 cap smart contract architecture, Agent ID verification, and agentic wallet prompts.",
    action: "Read documentation",
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
            Enter the world of Agent Legends. Verify your Agentic Wallet, recruit your
            legendary on-chain operatives, and join the next generation of AI-powered Web3 on BNB Smart Chain.
          </p>

          <div className="home-actions">
            <Link href="/mint" className="home-button home-button-primary">
              <Sparkles aria-hidden="true" />
              Recruit Operative
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/my-nfts" className="home-button home-button-secondary">
              My Collection
            </Link>
            <a
              href="https://x.com/agent_legends"
              target="_blank"
              rel="noopener noreferrer"
              className="home-button home-button-secondary flex items-center gap-2"
              title="Official X / Twitter"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X @agent_legends</span>
            </a>
          </div>

          <ul className="home-hero-points">
            <li><CheckCircle2 aria-hidden="true" /> 1 Free Mint for Agent Wallets</li>
            <li><CheckCircle2 aria-hidden="true" /> 0.0005 BNB Paid Mint (Max 9)</li>
            <li><CheckCircle2 aria-hidden="true" /> 2,000 Max Supply Cap</li>
          </ul>
        </div>

        <aside className="home-protocol-card" aria-label="Agent Legends platform overview">
          <div className="home-artwork" aria-hidden="true">
            <span className="home-artwork-orbit home-artwork-orbit-one" />
            <span className="home-artwork-orbit home-artwork-orbit-two" />
            <span className="home-artwork-core overflow-hidden flex items-center justify-center p-1 bg-slate-900 border-2 border-sky-400">
              <img
                src="/agent-legends-logo.jpg"
                alt="Agent Legends"
                className="w-full h-full object-cover rounded-full"
              />
            </span>
            <span className="home-artwork-caption">AGENT LEGENDS · BNB 56</span>
          </div>
          <span>Agent Legends protocol</span>
          <h2>Own your identity. Enter the arena.</h2>
          <div className="home-process">
            <div className="home-process-item">
              <span className="home-process-icon"><ShieldCheck aria-hidden="true" /></span>
              <div>
                <strong>01 · Verify Agent ID</strong>
                <p>Binance Agent ID holders automatically qualify for 1 Free Agent Legend mint.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><Sparkles aria-hidden="true" /></span>
              <div>
                <strong>02 · Mint Your Operatives</strong>
                <p>Claim your free agent or mint up to 9 paid NFTs for 0.0005 BNB each.</p>
              </div>
            </div>
            <div className="home-process-item">
              <span className="home-process-icon"><Users aria-hidden="true" /></span>
              <div>
                <strong>03 · Build Your Syndicate</strong>
                <p>Invite fellow Web3 agents and track recruitment across BNB Chain.</p>
              </div>
            </div>
          </div>
          <p className="home-fee-note">
            Total supply is capped strictly at 2,000 NFTs on BNB Smart Chain.
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
