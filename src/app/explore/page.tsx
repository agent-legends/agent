import Link from "next/link";
import { ArrowRight, ExternalLink, Shield, Sparkles } from "lucide-react";
import { StatsHeader } from "@/components/StatsHeader";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

export default function ExplorePage() {
  const contractAddress = CONTRACT_ADDRESSES[56].nft;

  return (
    <div className="space-y-8">
      <header className="explore-heading">
        <span className="page-kicker"><Shield aria-hidden="true" /> BNB Smart Chain · Mainnet</span>
        <h1>Explore Agent Legends</h1>
        <p>Discover the collection's live on-chain supply and contract activity. This deployment does not expose enumerable token methods; use the block explorer for token holdings.</p>
        <div className="explore-actions">
          <Link href="/mint"><Sparkles aria-hidden="true" /> Mint your NFT <ArrowRight aria-hidden="true" /></Link>
          <a href={`${CONTRACT_ADDRESSES[56].explorer}/token/${contractAddress}`} target="_blank" rel="noopener noreferrer">
            Open verified contract <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </header>
      <StatsHeader />
    </div>
  );
}
