"use client";

import { useAccount, useChainId, useReadContract } from "wagmi";
import { ExternalLink, LockKeyhole, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { isAddress } from "viem";
import { NFT_ABI } from "@/config/abis/nft";
import { getContractConfig } from "@/config/contracts";

export default function MyNftsPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = getContractConfig(chainId);
  const nftAddress = config && isAddress(config.nft) ? config.nft : undefined;
  const { data: balance, isLoading, error } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && nftAddress) },
  });

  return (
    <section className="collection-page">
      <header className="collection-heading">
        <span className="page-kicker"><Shield aria-hidden="true" /> On-chain collection</span>
        <h1>My Agent Legends</h1>
        <p>Collection balance is read from the NFT contract. Token IDs are not enumerable by this deployment, so this page does not fabricate NFT cards or traits.</p>
        <div className="collection-actions">
          <Link href="/mint"><Sparkles aria-hidden="true" /> Mint an Agent Legend</Link>
          <Link href="/staking"><LockKeyhole aria-hidden="true" /> Open staking</Link>
        </div>
      </header>

      {!isConnected ? (
        <div className="collection-state">Connect your wallet to check its on-chain NFT balance.</div>
      ) : !nftAddress ? (
        <div className="collection-state" role="alert">The NFT contract is not configured for this network.</div>
      ) : (
        <div className="collection-balance-card" aria-live="polite">
          <span>Wallet NFT balance</span>
          <strong>{isLoading ? "…" : error ? "Unavailable" : balance?.toString() ?? "0"}</strong>
          {error && <p role="alert">The NFT balance could not be read from the configured chain.</p>}
          {address && config && (
            <a
              href={`${config.explorer}/token/${nftAddress}?a=${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View token holdings on the block explorer <ExternalLink aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
