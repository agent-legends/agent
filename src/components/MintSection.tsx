"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { formatEther, isAddress, parseEther } from "viem";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Info,
  LoaderCircle,
  Lock,
  PauseCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { NFT_ABI } from "@/config/abis/nft";
import {
  getContractConfig,
  MAX_SUPPLY,
  MAX_FREE_SUPPLY,
  MAX_PAID_PER_WALLET,
  PAID_PRICE_BNB,
  PAID_PRICE_WEI,
} from "@/config/contracts";

export function MintSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [quantity, setQuantity] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncAttemptedHash, setSyncAttemptedHash] = useState<string | null>(null);
  const [mintType, setMintType] = useState<"FREE" | "PAID">("PAID");

  const config = getContractConfig(chainId);
  const supportedChainId = chainId === 56 || chainId === 97 ? chainId : undefined;
  const nftAddress = config && isAddress(config.nft) ? config.nft : undefined;

  // --- Read Contract States ---
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "totalSupply",
    query: { enabled: Boolean(nftAddress) },
  });

  const { data: freeMintedCount, refetch: refetchFreeMinted } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "freeMintedCount",
    query: { enabled: Boolean(nftAddress) },
  });

  const { data: remainingFreeSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "remainingFreeSupply",
    query: { enabled: Boolean(nftAddress) },
  });

  const { data: isPaused } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "mintPaused",
    query: { enabled: Boolean(nftAddress) },
  });

  // --- User-Specific Contract States ---
  const { data: isAgenticWallet, isLoading: isCheckingAgent } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "isAgenticWalletUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(nftAddress && address) },
  });

  const { data: hasClaimedFree, refetch: refetchClaimedFree } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "hasClaimedFree",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(nftAddress && address) },
  });

  const { data: totalMintedByWallet, refetch: refetchWalletMinted } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "totalMintedByWallet",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(nftAddress && address) },
  });

  const { data: remainingAllowance, refetch: refetchAllowance } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "remainingWalletAllowance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(nftAddress && address) },
  });

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: supportedChainId,
    query: { enabled: Boolean(address && supportedChainId) },
  });

  // Auto-switch default tab if agent wallet user hasn't claimed yet
  useEffect(() => {
    if (isAgenticWallet && !hasClaimedFree) {
      setMintType("FREE");
    } else {
      setMintType("PAID");
    }
  }, [isAgenticWallet, hasClaimedFree]);

  // Calculations
  const currentTotalSupply = totalSupply !== undefined ? Number(totalSupply) : 0;
  const currentFreeMinted = freeMintedCount !== undefined ? Number(freeMintedCount) : 0;
  const walletAllowance = remainingAllowance !== undefined ? Number(remainingAllowance) : 10;
  const walletTotalMinted = totalMintedByWallet !== undefined ? Number(totalMintedByWallet) : 0;
  const maxAvailablePaid = Math.min(MAX_PAID_PER_WALLET, walletAllowance);

  // Clamp quantity
  const effectiveQuantity = Math.max(1, Math.min(quantity, Math.max(1, maxAvailablePaid)));

  const totalCostBnb = (effectiveQuantity * Number(PAID_PRICE_BNB)).toFixed(4);
  const totalCostWei = BigInt(effectiveQuantity) * PAID_PRICE_WEI;

  // Wagmi Write
  const {
    data: transactionHash,
    error: walletError,
    isPending: isWalletPending,
    writeContractAsync,
    reset: resetWrite,
  } = useWriteContract();

  const {
    error: receiptError,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    confirmations: 2,
  });

  const isBusy = isWalletPending || isConfirming;

  // Sync after confirmation
  const syncMint = useCallback(
    async (hash: `0x${string}`) => {
      setSyncError(null);
      try {
        const response = await fetch("/api/mint/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address, txHash: hash }),
        });
        if (!response.ok) {
          let errMessage = "Mint records synchronization failed.";
          try {
            const errData = await response.json();
            errMessage = errData.error || errMessage;
          } catch {}
          throw new Error(errMessage);
        }
        await Promise.all([
          refetchTotalSupply(),
          refetchFreeMinted(),
          refetchClaimedFree(),
          refetchWalletMinted(),
          refetchAllowance(),
          refetchBalance(),
        ]);
      } catch (error: unknown) {
        setSyncError(error instanceof Error ? error.message : "Mint confirmation could not be synchronized.");
      }
    },
    [
      address,
      refetchTotalSupply,
      refetchFreeMinted,
      refetchClaimedFree,
      refetchWalletMinted,
      refetchAllowance,
      refetchBalance,
    ]
  );

  useEffect(() => {
    if (!isConfirmed || !transactionHash || !address || syncAttemptedHash === transactionHash) return;
    setSyncAttemptedHash(transactionHash);
    void syncMint(transactionHash);
  }, [isConfirmed, transactionHash, address, syncAttemptedHash, syncMint]);

  // Handle Free Mint
  const handleFreeMint = async () => {
    setFormError(null);
    if (!address || !nftAddress) {
      setFormError("Connect your Web3 wallet to claim your free Agent NFT.");
      return;
    }
    if (isPaused) {
      setFormError("Minting is currently paused on the smart contract.");
      return;
    }
    if (!isAgenticWallet) {
      setFormError("Your wallet is not recognized as an Agentic Wallet. Free mint is reserved for Binance Agent ID holders.");
      return;
    }
    if (hasClaimedFree) {
      setFormError("This wallet has already claimed its 1 Free Agent NFT.");
      return;
    }
    if (remainingFreeSupply !== undefined && remainingFreeSupply <= 0n) {
      setFormError("All 1,000 free Agent NFTs have already been claimed.");
      return;
    }

    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: chainId === 97 ? bscTestnet : bsc,
        abi: NFT_ABI,
        functionName: "claimFreeNFT",
      });
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Free mint transaction was rejected by wallet.");
    }
  };

  // Handle Paid Mint
  const handlePaidMint = async () => {
    setFormError(null);
    if (!address || !nftAddress) {
      setFormError("Connect your Web3 wallet to mint.");
      return;
    }
    if (isPaused) {
      setFormError("Minting is currently paused on the smart contract.");
      return;
    }
    if (walletAllowance < effectiveQuantity) {
      setFormError(`Exceeds remaining allowance. You can mint at most ${walletAllowance} more NFT(s).`);
      return;
    }
    if (currentTotalSupply + effectiveQuantity > MAX_SUPPLY) {
      setFormError("The requested quantity exceeds the remaining maximum supply of 2,000 NFTs.");
      return;
    }
    if (balance && balance.value < totalCostWei) {
      setFormError(
        `Insufficient BNB balance. Need at least ${totalCostBnb} BNB plus network gas fees.`
      );
      return;
    }

    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: chainId === 97 ? bscTestnet : bsc,
        abi: NFT_ABI,
        functionName: "mintPaid",
        args: [BigInt(effectiveQuantity)],
        value: totalCostWei,
      });
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Paid mint transaction was rejected by wallet.");
    }
  };

  const errorMessage =
    formError || walletError?.message || receiptError?.message || syncError;

  return (
    <section className="mint-shell" aria-labelledby="mint-title">
      <header className="mint-heading">
        <span className="page-kicker">
          <Sparkles aria-hidden="true" /> BNB Smart Chain · ERC-721 · 2,000 Max Supply
        </span>
        <h2 id="mint-title">Recruit your Agent Legend</h2>
        <p>
          First mint is <strong>FREE</strong> for verified Agentic Wallets. Paid mints available up to 9 per wallet at <strong>0.0005 BNB</strong> each.
        </p>
      </header>

      {/* Mint Mode Selector */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMintType("FREE");
              setFormError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              mintType === "FREE"
                ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AGENT FREE MINT (1 FREE)</span>
            {isAgenticWallet && !hasClaimedFree && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-slate-900 font-bold uppercase">
                Eligible
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setMintType("PAID");
              setFormError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              mintType === "PAID"
                ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PAID MINT (0.0005 BNB)</span>
          </button>
        </div>
      </div>

      {/* Contract Paused Alert */}
      {isPaused && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-center gap-3 text-xs font-mono">
          <PauseCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <span>
            Contract Status: Minting is currently paused on-chain by the contract owner.
          </span>
        </div>
      )}

      {/* Wallet Status Card (when connected) */}
      {isConnected && address && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Agentic Wallet:</span>
            {isCheckingAgent ? (
              <span className="text-slate-500">Verifying...</span>
            ) : isAgenticWallet ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" /> Verified Agent ID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Shield className="w-4 h-4 text-slate-500" /> Standard Wallet
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Free Claim:</span>
            {hasClaimedFree ? (
              <span className="text-amber-400 font-bold">Claimed (1/1)</span>
            ) : isAgenticWallet ? (
              <span className="text-emerald-400 font-bold">Available (1 Free)</span>
            ) : (
              <span className="text-slate-500">Agent ID Required</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Wallet Minted:</span>
            <span className="text-white font-bold">{walletTotalMinted} / 10 Max</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">BNB Balance:</span>
            <span className="text-white font-bold">
              {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* FREE MINT TAB */}
      {mintType === "FREE" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-sky-950/30 to-slate-900/60 border border-sky-500/30 text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-mono">
                1 Free Agent Legend NFT
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Reserved exclusively for holders of Binance Agent ID. Free mint price, only standard blockchain gas fee is required.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto py-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Free Mints Left</span>
                <span className="text-white font-bold text-sm">
                  {remainingFreeSupply !== undefined ? remainingFreeSupply.toString() : "996"} / 1,000
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">NFT Price</span>
                <span className="text-emerald-400 font-bold text-sm">0.0000 BNB (FREE)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px] uppercase">Allowance</span>
                <span className="text-white font-bold text-sm">1 Free per wallet</span>
              </div>
            </div>

            {hasClaimedFree ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>You have successfully claimed your free Agent Legend! You can mint up to 9 more via Paid Mint.</span>
              </div>
            ) : !isConnected ? (
              <p className="text-xs font-mono text-slate-400">
                Connect your wallet above to claim your free Agent Legend.
              </p>
            ) : !isAgenticWallet ? (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Info className="w-4 h-4" /> Agentic Wallet Verification Required
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The free mint is reserved for wallets holding a Binance Agent ID (contract: <code className="text-slate-300">0x60B9...022F</code>). Standard wallets can mint up to 9 NFTs directly via the <strong>Paid Mint</strong> tab at <strong>0.0005 BNB</strong> each!
                </p>
                <button
                  type="button"
                  onClick={() => setMintType("PAID")}
                  className="mt-2 text-xs font-mono text-sky-400 hover:text-sky-300 underline font-bold"
                >
                  Switch to Paid Mint (0.0005 BNB) →
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleFreeMint}
                disabled={isBusy || Boolean(isPaused)}
                className="w-full max-w-md mx-auto py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-bold tracking-wider bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isBusy ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Claiming Free NFT…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Claim 1 Free Agent Legend</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* PAID MINT TAB */}
      {mintType === "PAID" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-b from-violet-950/20 to-slate-900/60 border border-violet-500/30 text-center space-y-5">
            <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-mono">
                Paid Mint · 0.0005 BNB each
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Mint up to 9 NFTs per wallet at only 0.0005 BNB per operative (total collection supply: 2,000).
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Mint Quantity:</span>
                <span className="text-xs font-mono text-slate-400">
                  Max: {maxAvailablePaid} NFTs
                </span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isBusy}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold font-mono text-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  -
                </button>
                <div className="w-24 text-center">
                  <span className="text-2xl font-black text-white font-mono">{effectiveQuantity}</span>
                  <span className="block text-[10px] font-mono text-slate-500 uppercase">
                    Operative{effectiveQuantity > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAvailablePaid, q + 1))}
                  disabled={quantity >= maxAvailablePaid || isBusy}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold font-mono text-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex justify-center gap-2 pt-2">
                {[1, 3, 5, 9].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(Math.min(q, maxAvailablePaid))}
                    disabled={q > maxAvailablePaid || isBusy}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                      effectiveQuantity === q
                        ? "bg-violet-500 text-white font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-30"
                    }`}
                  >
                    {q} {q === 1 ? "NFT" : "NFTs"}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left">
                <span className="text-slate-400 block text-[10px] uppercase">Unit Price</span>
                <span className="text-white font-bold text-sm">0.0005 BNB</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Total Cost</span>
                <span className="text-violet-300 font-bold text-sm">{totalCostBnb} BNB</span>
              </div>
            </div>

            {/* Mint Action Button */}
            {!isConnected ? (
              <p className="text-xs font-mono text-slate-400">
                Connect your wallet to mint your Agent Legends.
              </p>
            ) : walletAllowance <= 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-amber-400 text-xs font-mono">
                You have reached your maximum wallet limit (10 NFTs).
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePaidMint}
                disabled={isBusy || Boolean(isPaused) || walletAllowance < effectiveQuantity}
                className="w-full max-w-md mx-auto py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-bold tracking-wider bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isBusy ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Minting {effectiveQuantity} NFT{effectiveQuantity > 1 ? "s" : ""}…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>
                      Mint {effectiveQuantity} Legend{effectiveQuantity > 1 ? "s" : ""} · {totalCostBnb} BNB
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {errorMessage && (
        <p className="mint-form-error text-center mt-4" role="alert">
          <AlertCircle aria-hidden="true" /> {errorMessage}
        </p>
      )}

      {isConfirmed && transactionHash && (
        <div className="mint-confirmed text-center mt-4 space-y-2">
          <p role="status">
            <CheckCircle2 aria-hidden="true" /> Agent Legend mint confirmed on BNB Smart Chain!
          </p>
          <a
            href={`${config?.explorer}/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 underline"
          >
            <span>View transaction on BscScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Contract & Explorer Quick Reference */}
      <footer className="mint-footer">
        <div>
          <span>Contract address</span>
          <strong>0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912</strong>
        </div>
        <div>
          <span>Total Supply</span>
          <strong>2,000 NFTs</strong>
        </div>
        <div>
          <span>Agent ID Registry</span>
          <strong>0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F</strong>
        </div>
        <div>
          <span>Network</span>
          <strong>BNB Smart Chain (56)</strong>
        </div>
      </footer>
    </section>
  );
}
