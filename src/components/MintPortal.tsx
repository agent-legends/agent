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
import { bsc } from "wagmi/chains";
import { formatEther, isAddress, parseEther } from "viem";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Flame,
  Info,
  LoaderCircle,
  Lock,
  PauseCircle,
  PlayCircle,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users,
  Zap,
} from "lucide-react";
import { NFT_ABI } from "@/config/abis/nft";
import {
  getContractConfig,
  MAX_SUPPLY,
  MAX_FREE_SUPPLY,
  MAX_PER_WALLET,
  PAID_PRICE_BNB,
  PAID_PRICE_WEI,
} from "@/config/contracts";

export function MintPortal() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"FREE" | "PAID">("PAID");
  const [actionError, setActionError] = useState<string | null>(null);

  // Owner admin panel state
  const [treasuryRecipient, setTreasuryRecipient] = useState("");
  const [treasuryQuantity, setTreasuryQuantity] = useState(1);
  const [newBaseUri, setNewBaseUri] = useState("");
  const [adminStatusMsg, setAdminStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const config = getContractConfig(56);
  const nftAddress = (config && isAddress(config.nft) ? config.nft : undefined) as `0x${string}` | undefined;
  const isCorrectNetwork = chainId === 56;

  // Enforce automatic network switch to BNB Smart Chain (56)
  useEffect(() => {
    if (isConnected && chainId !== 56 && switchChain) {
      switchChain({ chainId: 56 });
    }
  }, [isConnected, chainId, switchChain]);

  // --- Read Contract States ---
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });

  const { data: remainingFreeSupply, refetch: refetchFreeSupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "remainingFreeSupply",
  });

  const { data: freeMintedCount } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "freeMintedCount",
  });

  const { data: mintPaused, refetch: refetchMintPaused } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "mintPaused",
  });

  const { data: ownerAddress } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "owner",
  });

  const { data: remainingTreasurySupply } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "remainingTreasurySupply",
  });

  // --- User-Specific Contract States ---
  const { data: isAgenticWallet, isLoading: isCheckingAgent } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "isAgenticWalletUser",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: hasClaimedFree, refetch: refetchClaimedFree } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "hasClaimedFree",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: remainingAllowance, refetch: refetchAllowance } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "remainingWalletAllowance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: totalMintedByWallet, refetch: refetchWalletMinted } = useReadContract({
    address: nftAddress,
    abi: NFT_ABI,
    functionName: "totalMintedByWallet",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  // Check if connected wallet is owner
  const isOwner = Boolean(
    address &&
      ownerAddress &&
      address.toLowerCase() === ownerAddress.toLowerCase()
  );

  // Auto-select tab: if user holds agentic wallet and hasn't claimed yet, suggest Free Mint
  useEffect(() => {
    if (isAgenticWallet && !hasClaimedFree) {
      setActiveTab("FREE");
    }
  }, [isAgenticWallet, hasClaimedFree]);

  // Supply and allowance calculations
  const currentTotal = totalSupply !== undefined ? Number(totalSupply) : 0;
  const freeRem = remainingFreeSupply !== undefined ? Number(remainingFreeSupply) : 996;
  const freeUsed = Math.max(0, MAX_FREE_SUPPLY - freeRem);

  // Remaining paid supply = 2000 - totalSupply - remainingFreeSupply
  const remainingPaidPool = Math.max(0, MAX_SUPPLY - currentTotal - freeRem);

  // User allowance calculation
  const walletRemaining = remainingAllowance !== undefined ? Number(remainingAllowance) : 10;
  const walletMinted = totalMintedByWallet !== undefined ? Number(totalMintedByWallet) : (10 - walletRemaining);

  // Maximum paid quantity user can mint right now
  const maxMintablePaid = Math.max(0, Math.min(walletRemaining, remainingPaidPool));
  const effectiveQuantity = Math.max(1, Math.min(quantity, Math.max(1, maxMintablePaid)));

  const totalCostBnb = (effectiveQuantity * Number(PAID_PRICE_BNB)).toFixed(4);
  const totalCostWei = BigInt(effectiveQuantity) * PAID_PRICE_WEI;

  // Wagmi Write Contract
  const {
    data: txHash,
    error: writeError,
    isPending: isWritePending,
    writeContractAsync,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    confirmations: 2,
  });

  const isBusy = isWritePending || isConfirming;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchTotalSupply(),
      refetchFreeSupply(),
      refetchClaimedFree(),
      refetchAllowance(),
      refetchWalletMinted(),
      refetchBalance(),
      refetchMintPaused(),
    ]);
  }, [
    refetchTotalSupply,
    refetchFreeSupply,
    refetchClaimedFree,
    refetchAllowance,
    refetchWalletMinted,
    refetchBalance,
    refetchMintPaused,
  ]);

  useEffect(() => {
    if (isConfirmed && txHash) {
      refetchAll();
      // Also notify backend indexer
      fetch("/api/mint/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, txHash }),
      }).catch(() => {});
    }
  }, [isConfirmed, txHash, address, refetchAll]);

  // Handle Free Mint
  const handleClaimFree = async () => {
    setActionError(null);
    if (!address || !nftAddress) {
      setActionError("Please connect your wallet first.");
      return;
    }
    if (!isCorrectNetwork) {
      if (switchChain) switchChain({ chainId: 56 });
      return;
    }
    if (mintPaused) {
      setActionError("Minting is currently paused on the smart contract.");
      return;
    }
    if (!isAgenticWallet) {
      setActionError("This wallet does not hold a Binance Agent ID (.ai). Free mint is reserved for .ai holders.");
      return;
    }
    if (hasClaimedFree) {
      setActionError("You have already claimed your 1 free Agent ID NFT.");
      return;
    }
    if (freeRem <= 0) {
      setActionError("All 1,000 free Agent ID claims have been used.");
      return;
    }

    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "claimFreeNFT",
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Free claim transaction was rejected.");
    }
  };

  // Handle Paid Mint
  const handleMintPaid = async () => {
    setActionError(null);
    if (!address || !nftAddress) {
      setActionError("Please connect your wallet first.");
      return;
    }
    if (!isCorrectNetwork) {
      if (switchChain) switchChain({ chainId: 56 });
      return;
    }
    if (mintPaused) {
      setActionError("Minting is currently paused on the smart contract.");
      return;
    }
    if (maxMintablePaid <= 0) {
      setActionError("You have reached your wallet limit or remaining paid supply is exhausted.");
      return;
    }
    if (balance && balance.value < totalCostWei) {
      setActionError(`Insufficient BNB balance. Required: ${totalCostBnb} BNB plus gas.`);
      return;
    }

    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "mintPaid",
        args: [BigInt(effectiveQuantity)],
        value: totalCostWei,
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Paid mint transaction was rejected.");
    }
  };

  // Owner Admin Handlers
  const handleTogglePause = async () => {
    if (!isOwner || !nftAddress || !address) return;
    setAdminStatusMsg(null);
    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "setMintPaused",
        args: [!mintPaused],
      });
      setAdminStatusMsg({ text: `Toggle pause transaction submitted.`, isError: false });
    } catch (err: unknown) {
      setAdminStatusMsg({ text: err instanceof Error ? err.message : "Failed to toggle pause.", isError: true });
    }
  };

  const handleMintTreasury = async () => {
    if (!isOwner || !nftAddress || !address) return;
    setAdminStatusMsg(null);
    if (!isAddress(treasuryRecipient)) {
      setAdminStatusMsg({ text: "Enter a valid recipient EVM address.", isError: true });
      return;
    }
    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "mintTreasury",
        args: [treasuryRecipient as `0x${string}`, BigInt(treasuryQuantity)],
      });
      setAdminStatusMsg({ text: `Treasury mint submitted for ${treasuryQuantity} NFT(s).`, isError: false });
    } catch (err: unknown) {
      setAdminStatusMsg({ text: err instanceof Error ? err.message : "Treasury mint failed.", isError: true });
    }
  };

  const handleSetBaseURI = async () => {
    if (!isOwner || !nftAddress || !address) return;
    setAdminStatusMsg(null);
    if (!newBaseUri.trim()) {
      setAdminStatusMsg({ text: "Enter a valid Base URI string.", isError: true });
      return;
    }
    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "setBaseURI",
        args: [newBaseUri.trim()],
      });
      setAdminStatusMsg({ text: "Base URI update transaction submitted.", isError: false });
    } catch (err: unknown) {
      setAdminStatusMsg({ text: err instanceof Error ? err.message : "Failed to update Base URI.", isError: true });
    }
  };

  const handleWithdraw = async () => {
    if (!isOwner || !nftAddress || !address) return;
    setAdminStatusMsg(null);
    try {
      await writeContractAsync({
        address: nftAddress,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "withdraw",
      });
      setAdminStatusMsg({ text: "Withdraw transaction submitted.", isError: false });
    } catch (err: unknown) {
      setAdminStatusMsg({ text: err instanceof Error ? err.message : "Withdraw failed.", isError: true });
    }
  };

  const errorMessage = actionError || writeError?.message;

  return (
    <section className="mint-shell max-w-4xl mx-auto space-y-8" aria-labelledby="mint-title">
      {/* Network Warning Banner */}
      {isConnected && !isCorrectNetwork && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              Wrong network detected. Agent Legends is deployed on <strong>BNB Smart Chain (Chain ID: 56)</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchChain && switchChain({ chainId: 56 })}
            disabled={isSwitching}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isSwitching ? "Switching..." : "Switch to BNB Chain"}</span>
          </button>
        </div>
      )}

      {/* Contract Paused Alert */}
      {mintPaused && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center gap-3 text-xs font-mono text-red-300">
          <PauseCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>
            Contract Alert: Minting is currently paused on-chain by the contract owner.
          </span>
        </div>
      )}

      {/* Hero Stats & Progress Bar */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/20 bg-slate-900/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400 font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" /> BNB Smart Chain · Mainnet (56)
            </span>
            <h2 id="mint-title" className="text-2xl sm:text-3xl font-black text-white font-mono uppercase tracking-wide">
              Agent Legends Mint
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Strictly capped at 2,000 operatives. SPACE ID .ai Agent verification enabled.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 self-start sm:self-auto font-mono text-xs">
            <div className="text-center px-2">
              <span className="block text-slate-500 text-[10px] uppercase">Minted</span>
              <span className="text-base font-black text-white">{currentTotal} / 2,000</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="block text-slate-500 text-[10px] uppercase">Free Agent Claims</span>
              <span className="text-base font-black text-emerald-400">{freeUsed} / 1,000</span>
            </div>
          </div>
        </div>

        {/* Total Supply Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Total Minted Progress</span>
            <span className="text-sky-300 font-bold">
              {((currentTotal / MAX_SUPPLY) * 100).toFixed(1)}% ({MAX_SUPPLY - currentTotal} remaining)
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-md shadow-sky-500/20"
              style={{ width: `${Math.min(100, (currentTotal / MAX_SUPPLY) * 100)}%` }}
            />
          </div>
        </div>

        {/* Free Agent Claims Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Agent ID Free Claims (.ai Pool)</span>
            <span className="text-emerald-400 font-bold">
              {freeUsed} / 1,000 used ({freeRem} free claims left)
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (freeUsed / MAX_FREE_SUPPLY) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Connected Wallet Intelligence Banner */}
      {isConnected && address && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase">Agent ID (.ai)</span>
            {isCheckingAgent ? (
              <span className="text-slate-400 font-bold">Checking...</span>
            ) : isAgenticWallet ? (
              <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified .ai
              </span>
            ) : (
              <span className="text-slate-400 inline-flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Standard
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase">1 Free Claim</span>
            {hasClaimedFree ? (
              <span className="text-amber-400 font-bold">Claimed (1/1)</span>
            ) : isAgenticWallet ? (
              <span className="text-emerald-400 font-bold">Available (1 Free)</span>
            ) : (
              <span className="text-slate-500">Requires .ai ID</span>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase">Wallet Allowance</span>
            <span className="text-white font-bold">
              {walletRemaining} / 10 remaining ({walletMinted} minted)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-500 block text-[10px] uppercase">BNB Balance</span>
            <span className="text-white font-bold truncate">
              {balance ? `${Number(balance.formatted).toFixed(4)} BNB` : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Mint Mode Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("FREE");
              setActionError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === "FREE"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AGENT FREE MINT (1 FREE)</span>
            {isAgenticWallet && !hasClaimedFree && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-950 font-bold">
                ELIGIBLE
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("PAID");
              setActionError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === "PAID"
                ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PAID MINT (0.0005 BNB)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FREE MINT */}
      {activeTab === "FREE" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 text-center space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white font-mono uppercase tracking-wide">
              1 Free Agent Legend NFT
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Reserved strictly for wallets holding a SPACE ID Binance Agent ID (<code className="text-emerald-300">.ai</code> domain). Zero mint price; pay only normal blockchain gas.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Free Remaining</span>
              <span className="text-white font-bold text-sm">{freeRem} / 1,000</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Mint Fee</span>
              <span className="text-emerald-400 font-bold text-sm">0.0000 BNB (FREE)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block text-[10px] uppercase">Limit</span>
              <span className="text-white font-bold text-sm">1 Free / Eligible Wallet</span>
            </div>
          </div>

          {hasClaimedFree ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>You have already claimed your 1 Free Agent NFT! You can mint up to 9 more via Paid Mint.</span>
            </div>
          ) : !isConnected ? (
            <p className="text-xs font-mono text-slate-400">
              Connect your Web3 wallet or Binance Agentic Wallet above to claim your free operative.
            </p>
          ) : !isAgenticWallet ? (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Info className="w-4 h-4" /> Binance Agent ID (.ai) Required
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The free mint pool is restricted to wallets holding an on-chain Binance Agent ID (<code className="text-slate-300">.ai</code> domain). Standard wallets can mint up to 10 operatives directly through the <strong>Paid Mint</strong> tab at <strong>0.0005 BNB</strong> each!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("PAID")}
                className="mt-2 text-xs font-mono text-sky-400 hover:text-sky-300 underline font-bold"
              >
                Go to Paid Mint (0.0005 BNB) →
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClaimFree}
              disabled={isBusy || Boolean(mintPaused)}
              className="w-full max-w-md mx-auto py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-bold tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isBusy ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Claiming 1 Free NFT...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Claim 1 Free NFT (0 BNB)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* TAB 2: PAID MINT */}
      {activeTab === "PAID" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-slate-900/60 text-center space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            <Zap className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-white font-mono uppercase tracking-wide">
              Paid Mint · 0.0005 BNB Each
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Open to all Web3 wallets. Agent ID holders can mint up to 9 paid NFTs; regular wallets up to 10 NFTs total.
            </p>
          </div>

          {/* Quantity Selector */}
          <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Mint Quantity:</span>
              <span className="text-slate-400">
                Max Allowed: <strong className="text-white">{maxMintablePaid}</strong> NFTs
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
                onClick={() => setQuantity((q) => Math.min(maxMintablePaid, q + 1))}
                disabled={quantity >= maxMintablePaid || isBusy}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold font-mono text-lg flex items-center justify-center disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>

            {/* Quick-Select Buttons */}
            <div className="flex justify-center gap-2 pt-1">
              {[1, 3, 5, 9, 10]
                .filter((q) => q <= maxMintablePaid)
                .map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    disabled={isBusy}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                      effectiveQuantity === q
                        ? "bg-violet-500 text-white font-bold"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {q}
                  </button>
                ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-left">
              <span className="text-slate-500 block text-[10px] uppercase">Unit Price</span>
              <span className="text-white font-bold text-sm">0.0005 BNB</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-right">
              <span className="text-slate-500 block text-[10px] uppercase">Total Cost</span>
              <span className="text-violet-300 font-bold text-sm">{totalCostBnb} BNB</span>
            </div>
          </div>

          {/* Mint Button */}
          {!isConnected ? (
            <p className="text-xs font-mono text-slate-400">
              Connect your Web3 wallet or Binance Agentic Wallet to mint your Agent Legends.
            </p>
          ) : maxMintablePaid <= 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-amber-400 text-xs font-mono">
              You have reached your maximum wallet limit (10 NFTs total) or remaining paid supply is exhausted.
            </div>
          ) : (
            <button
              type="button"
              onClick={handleMintPaid}
              disabled={isBusy || Boolean(mintPaused) || effectiveQuantity > maxMintablePaid}
              className="w-full max-w-md mx-auto py-3.5 px-6 rounded-xl font-mono text-xs uppercase font-bold tracking-wider bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isBusy ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Minting {effectiveQuantity} NFT{effectiveQuantity > 1 ? "s" : ""}...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    Mint Paid NFTs ({effectiveQuantity} for {totalCostBnb} BNB)
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error & Success Feedback */}
      {errorMessage && (
        <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-center gap-2 text-center" role="alert">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {isConfirmed && txHash && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
          <p className="text-xs font-mono text-emerald-300 font-bold flex items-center justify-center gap-1.5" role="status">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Transaction confirmed on BNB Smart Chain!</span>
          </p>
          <a
            href={`https://bscscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 underline"
          >
            <span>View transaction on BscScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* OWNER ADMIN PANEL (Rendered only when connected address === owner) */}
      {isOwner && (
        <div className="p-6 rounded-3xl border border-amber-500/30 bg-slate-950/90 space-y-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Settings className="w-4 h-4" />
              <span>CONTRACT OWNER ADMIN PANEL</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>

          {adminStatusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                adminStatusMsg.isError
                  ? "bg-red-500/10 border border-red-500/30 text-red-300"
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}
            >
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{adminStatusMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Toggle Mint Paused */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-slate-400 font-bold block">Mint Status Control</span>
              <p className="text-[11px] text-slate-500">
                Current status: <strong className={mintPaused ? "text-red-400" : "text-emerald-400"}>{mintPaused ? "PAUSED" : "ACTIVE"}</strong>
              </p>
              <button
                type="button"
                onClick={handleTogglePause}
                disabled={isBusy}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  mintPaused
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                {mintPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                <span>{mintPaused ? "Unpause Minting" : "Pause Minting"}</span>
              </button>
            </div>

            {/* 2. Withdraw BNB */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-slate-400 font-bold block">Withdraw Contract Funds</span>
              <p className="text-[11px] text-slate-500">
                Withdraw accumulated BNB mint revenue to owner address.
              </p>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isBusy}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-amber-500/30 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Withdraw All BNB</span>
              </button>
            </div>

            {/* 3. Treasury Mint */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-slate-400 font-bold block">
                Treasury Mint ({remainingTreasurySupply !== undefined ? remainingTreasurySupply.toString() : "50"} left of 50 max)
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Recipient address (0x...)"
                  value={treasuryRecipient}
                  onChange={(e) => setTreasuryRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={treasuryQuantity}
                    onChange={(e) => setTreasuryQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleMintTreasury}
                    disabled={isBusy}
                    className="flex-1 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mint Treasury</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Set Base URI */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-slate-400 font-bold block">Update Metadata Base URI</span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://agent.agentlegends.workers.dev/metadata/"
                  value={newBaseUri}
                  onChange={(e) => setNewBaseUri(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleSetBaseURI}
                  disabled={isBusy}
                  className="w-full px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors"
                >
                  Update Base URI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
