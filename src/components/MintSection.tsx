"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useEstimateGas,
  useEstimateFeesPerGas,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { encodeFunctionData, formatEther, isAddress } from "viem";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { NFT_ABI } from "@/config/abis/nft";
import { AGENT_REGISTRY_ABI } from "@/config/abis/agentRegistry";
import { getContractConfig } from "@/config/contracts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_MINT_PER_TRANSACTION = 20;

export function MintSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const searchParams = useSearchParams();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [quantity, setQuantity] = useState(1);
  const [referrer, setReferrer] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAttemptedHash, setSyncAttemptedHash] = useState<string | null>(null);

  const config = getContractConfig(chainId);
  const supportedChainId = chainId === 56 || chainId === 97 ? chainId : undefined;
  const nftAddress = config && isAddress(config.nft) ? config.nft : undefined;
  const registryAddress = config && isAddress(config.registry) ? config.registry : undefined;

  useEffect(() => {
    const referral = searchParams.get("ref");
    if (referral && isAddress(referral)) setReferrer(referral);
  }, [searchParams]);

  const { data: feeWei, isLoading: isQuoteLoading, error: quoteError } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "quotePlatformFee",
    args: [BigInt(quantity)],
    query: { enabled: Boolean(nftAddress) },
  });
  const { data: mintedSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "totalMinted",
    query: { enabled: Boolean(nftAddress) },
  });
  const { data: maxSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "MAX_SUPPLY",
    query: { enabled: Boolean(nftAddress) },
  });
  const { data: configuredRegistry } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "agentRegistry",
    query: { enabled: Boolean(nftAddress) },
  });
  const { data: verificationEnabled } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "agentVerificationEnabled",
    query: { enabled: Boolean(nftAddress) },
  });
  const registryMatches =
    Boolean(configuredRegistry && registryAddress) &&
    configuredRegistry?.toLowerCase() === registryAddress?.toLowerCase();
  const { data: registryBalance, isLoading: isCheckingEligibility } = useReadContract({
    address: registryMatches ? registryAddress : undefined,
    abi: AGENT_REGISTRY_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && verificationEnabled && registryMatches),
    },
  });

  const mintCalldata = useMemo(() => {
    if (!nftAddress) return undefined;
    return encodeFunctionData({
      abi: NFT_ABI,
      functionName: "mint",
      args: [BigInt(quantity), (referrer && isAddress(referrer) ? referrer : ZERO_ADDRESS) as `0x${string}`],
    });
  }, [nftAddress, quantity, referrer]);
  const { data: gasEstimate, error: gasEstimateError } = useEstimateGas({
    account: address,
    to: nftAddress,
    data: mintCalldata,
    value: feeWei,
    query: { enabled: Boolean(address && nftAddress && mintCalldata && feeWei !== undefined) },
  });
  const { data: gasFees } = useEstimateFeesPerGas({
    chainId: supportedChainId,
    query: { enabled: Boolean(supportedChainId) },
  });
  const gasPriceEstimate = gasFees?.gasPrice ?? gasFees?.maxFeePerGas;
  const gasCostEstimate =
    gasEstimate !== undefined && gasPriceEstimate !== undefined
      ? gasEstimate * gasPriceEstimate
      : undefined;
  const { data: balance } = useBalance({
    address,
    chainId: supportedChainId,
    query: { enabled: Boolean(address && supportedChainId) },
  });

  const {
    data: transactionHash,
    error: walletError,
    isPending: isWalletPending,
    writeContractAsync,
  } = useWriteContract();
  const {
    error: receiptError,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    confirmations: 3,
  });

  const remainingSupply =
    mintedSupply !== undefined && maxSupply !== undefined
      ? maxSupply > mintedSupply
        ? maxSupply - mintedSupply
        : 0n
      : undefined;
  const hasEnoughSupply =
    remainingSupply !== undefined && remainingSupply >= BigInt(quantity);
  const hasEnoughBalance =
    balance !== undefined &&
    feeWei !== undefined &&
    balance.value >= feeWei + (gasCostEstimate ?? 0n);
  const requiresAgentId = verificationEnabled === true;
  const isEligible =
    !requiresAgentId || (registryMatches && registryBalance !== undefined && registryBalance > 0n);
  const isBusy = isWalletPending || isConfirming;
  const canMint =
    Boolean(isConnected && address && nftAddress && feeWei !== undefined) &&
    verificationEnabled !== undefined &&
    hasEnoughSupply &&
    hasEnoughBalance &&
    isEligible &&
    !isBusy;

  const syncMint = useCallback(async (hash: `0x${string}`) => {
    setSyncError(null);
    try {
      const response = await fetch("/api/mint/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, txHash: hash }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mint data could not be synchronized.");
    } catch (error: unknown) {
      setSyncError(error instanceof Error ? error.message : "Mint data could not be synchronized.");
    }
  }, [address]);

  useEffect(() => {
    if (!isConfirmed || !transactionHash || !address || syncAttemptedHash === transactionHash) return;
    setSyncAttemptedHash(transactionHash);
    void syncMint(transactionHash);
  }, [isConfirmed, transactionHash, address, syncAttemptedHash, syncMint]);

  const handleMint = async () => {
    setFormError(null);
    if (!address || !nftAddress || !feeWei) {
      setFormError("Connect a wallet and wait for the on-chain platform-fee quote.");
      return;
    }
    if (verificationEnabled === undefined) {
      setFormError("Wait for the NFT contract's eligibility requirement to load.");
      return;
    }
    if (referrer && (!isAddress(referrer) || referrer.toLowerCase() === address.toLowerCase())) {
      setFormError("Enter a valid referral wallet, or leave this field empty. Self-referrals are not allowed.");
      return;
    }
    if (!hasEnoughSupply) {
      setFormError("The requested quantity exceeds the remaining on-chain supply.");
      return;
    }
    if (!hasEnoughBalance) {
      setFormError("Your BNB balance does not cover the platform fee. Gas is charged separately.");
      return;
    }
    if (!isEligible) {
      setFormError(
        requiresAgentId
          ? "This contract requires an eligible Agent ID. Verify ownership in the configured registry."
          : "The NFT contract and configured Agent ID registry do not match."
      );
      return;
    }
    try {
      await writeContractAsync({
        address: nftAddress,
        abi: NFT_ABI,
        functionName: "mint",
        args: [
          BigInt(quantity),
          (referrer ? referrer : ZERO_ADDRESS) as `0x${string}`,
        ],
        value: feeWei,
      });
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "The wallet rejected the mint transaction.");
    }
  };

  const formattedFee = feeWei === undefined ? null : formatEther(feeWei);
  const errorMessage =
    formError || walletError?.message || receiptError?.message || quoteError?.message;

  return (
    <section className="mint-shell" aria-labelledby="mint-title">
      <header className="mint-heading">
        <span className="page-kicker"><Sparkles aria-hidden="true" /> BNB Smart Chain · ERC-721</span>
        <h2 id="mint-title">Claim your legend</h2>
        <p>Minting is free. The on-chain quote covers the platform fee only; blockchain gas is separate.</p>
      </header>

      <div className="mint-fee-banner" role="note">
        <strong>FREE NFT MINT</strong>
        <span>$0.10 platform fee per NFT in BNB, plus gas</span>
      </div>

      {!isConnected ? (
        <p className="mint-status-note">Connect a wallet to read the live contract quote and continue.</p>
      ) : !config ? (
        <div className="mint-warning" role="alert">
          This wallet is on an unsupported network. Switch to BNB Smart Chain to mint.
          <button type="button" onClick={() => switchChain({ chainId: 56 })} disabled={isSwitching}>
            {isSwitching ? "Switching…" : "Switch to BNB Chain"}
          </button>
        </div>
      ) : !nftAddress ? (
        <p className="mint-warning" role="alert">The NFT contract is not configured for this network.</p>
      ) : (
        <>
          <div className="mint-supply-row" aria-live="polite">
            <span>On-chain supply</span>
            <strong>
              {mintedSupply !== undefined && maxSupply !== undefined
                ? `${mintedSupply.toLocaleString()} / ${maxSupply.toLocaleString()}`
                : "Loading contract data…"}
            </strong>
          </div>

          <div className="mint-quantity-control">
            <div>
              <span className="mint-field-label">Quantity</span>
              <span className="mint-field-hint">Up to {MAX_MINT_PER_TRANSACTION} per transaction</span>
            </div>
            <div className="mint-stepper">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1 || isBusy}
              >
                <ChevronDown aria-hidden="true" />
              </button>
              <output aria-label="Selected quantity">{quantity}</output>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((value) => Math.min(MAX_MINT_PER_TRANSACTION, value + 1))}
                disabled={quantity >= MAX_MINT_PER_TRANSACTION || isBusy}
              >
                <ChevronUp aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mint-referral-control">
            <label htmlFor="referrer">
              <Users aria-hidden="true" /> Referral wallet <span>(optional)</span>
            </label>
            <input
              id="referrer"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x..."
              value={referrer}
              onChange={(event) => setReferrer(event.target.value.trim())}
              disabled={isBusy}
            />
            {referrer && isAddress(referrer) && address && referrer.toLowerCase() === address.toLowerCase() && (
              <span className="mint-inline-error">Self-referrals are not allowed.</span>
            )}
          </div>

          <dl className="mint-cost-breakdown">
            <div><dt>NFT purchase price</dt><dd>$0.00</dd></div>
            <div><dt>Platform fee</dt><dd>{formattedFee ? `${formattedFee} BNB` : isQuoteLoading ? "Quoting…" : "Unavailable"}</dd></div>
            <div><dt>Fee USD reference</dt><dd>${(quantity * 0.1).toFixed(2)} USD</dd></div>
            <div>
              <dt>Estimated gas</dt>
              <dd>
                {gasCostEstimate !== undefined
                  ? `${formatEther(gasCostEstimate)} BNB (${gasEstimate?.toString()} units)`
                  : gasEstimate !== undefined
                    ? `${gasEstimate.toString()} units; fee unavailable`
                  : gasEstimateError
                    ? "Estimate unavailable"
                    : "Estimating…"}
              </dd>
            </div>
            <div>
              <dt>Estimated total</dt>
              <dd>
                {feeWei === undefined
                  ? "Waiting for quote…"
                  : gasCostEstimate === undefined
                    ? `${formattedFee} BNB + gas`
                    : `${formatEther(feeWei + gasCostEstimate)} BNB`}
              </dd>
            </div>
            <div className="mint-cost-total"><dt>Wallet balance</dt><dd>{balance ? `${Number(balance.formatted).toFixed(5)} BNB` : "Loading…"}</dd></div>
          </dl>
          <p className="mint-gas-note">
            The platform fee is not the NFT purchase price. BNB gas is paid separately to the network.
          </p>

          {requiresAgentId && (
            <p className={`mint-eligibility ${isEligible ? "is-eligible" : ""}`} role="status">
              <Shield aria-hidden="true" />
              {isCheckingEligibility
                ? "Checking Agent ID ownership…"
                : !registryMatches
                  ? "The verified NFT and supplied Agent ID registry addresses do not match."
                  : isEligible
                    ? "Agent ID eligibility verified on-chain."
                    : "An eligible Agent ID is required by this contract."}
            </p>
          )}

          <button type="button" className="mint-submit" onClick={handleMint} disabled={!canMint}>
            {isWalletPending ? (
              <><LoaderCircle className="animate-spin" aria-hidden="true" /> Confirm in wallet</>
            ) : isConfirming ? (
              <><LoaderCircle className="animate-spin" aria-hidden="true" /> Confirming on BNB Chain</>
            ) : (
              <><Sparkles aria-hidden="true" /> Mint {quantity} {quantity === 1 ? "NFT" : "NFTs"} · free + fee</>
            )}
          </button>
        </>
      )}

      {errorMessage && (
        <p className="mint-error" role="alert">
          <AlertCircle aria-hidden="true" /> {errorMessage}
        </p>
      )}

      {isConfirmed && transactionHash && config && (
        <div className="mint-success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <strong>Transaction confirmed</strong>
            <p>Your mint is confirmed on-chain. Newly minted NFTs will appear after ownership data refreshes.</p>
            <a href={`${config.explorer}/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">
              View transaction <ExternalLink aria-hidden="true" />
            </a>
            {syncError && (
              <p>
                Dashboard sync: {syncError}{" "}
                <button type="button" onClick={() => void syncMint(transactionHash)}>Retry sync</button>
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
