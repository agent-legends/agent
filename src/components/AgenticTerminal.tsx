"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useSearchParams } from "next/navigation";
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  parseEther,
  parseUnits,
  getAddress,
} from "viem";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Link as LinkIcon,
  LoaderCircle,
  Lock,
  PauseCircle,
  PlayCircle,
  Radio,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Unlock,
  Users,
  Zap,
} from "lucide-react";

import {
  CONTRACT_ADDRESSES,
  MAX_SHARES,
  PANCAKE_LAUNCH_THRESHOLD,
  TOKENS_PER_SHARE,
  START_SHARE_PRICE_USDT,
  SHARE_PRICE_INCREMENT,
  MAX_SUPPLY as NFT_MAX_SUPPLY,
  MAX_FREE_SUPPLY as NFT_MAX_FREE_SUPPLY,
  PAID_PRICE_BNB as NFT_PAID_PRICE_BNB,
  PAID_PRICE_WEI as NFT_PAID_PRICE_WEI,
} from "@/config/contracts";
import { SHARE_MINT_ABI } from "@/config/abis/shareMint";
import { ERC20_ABI } from "@/config/abis/erc20";
import { NFT_ABI } from "@/config/abis/nft";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface ActivityItem {
  id: string;
  type: "MINT" | "REFERRAL";
  account: string;
  detail: string;
  txHash: string;
}

export function AgenticTerminal({ defaultTab = "SHARES" }: { defaultTab?: "SHARES" | "NFTS" } = {}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const searchParams = useSearchParams();

  // Active Tab: 1 for Shares, 2 for NFTs
  const [activeTab, setActiveTab] = useState<"SHARES" | "NFTS">(() => {
    const tabParam = searchParams.get("tab")?.toUpperCase();
    if (tabParam === "NFTS" || tabParam === "NFT") return "NFTS";
    if (tabParam === "SHARES" || tabParam === "SHARE") return "SHARES";
    return defaultTab;
  });

  // Share Mint Inputs
  const [shareQty, setShareQty] = useState<number>(10);
  const [customQtyInput, setCustomQtyInput] = useState<string>("10");
  const [referrerAddress, setReferrerAddress] = useState<string>(ZERO_ADDRESS);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // NFT Mint Inputs
  const [nftQty, setNftQty] = useState<number>(1);
  const [nftTab, setNftTab] = useState<"FREE" | "PAID">("FREE");

  // Owner Admin inputs
  const [adminStatus, setAdminStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [teamRecipient, setTeamRecipient] = useState<string>("");
  const [initialLockDays, setInitialLockDays] = useState<number>(365);
  const [lockDurationDays, setLockDurationDays] = useState<number>(180);
  const [withdrawLpTo, setWithdrawLpTo] = useState<string>("");
  const [withdrawLpAmt, setWithdrawLpAmt] = useState<string>("");

  // Recent Activity Feed
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const isBscMainnet = chainId === 56;
  const config = CONTRACT_ADDRESSES[56];

  // Parse and validate ?ref= from URL
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam && isAddress(refParam) && refParam.toLowerCase() !== address?.toLowerCase()) {
      setReferrerAddress(refParam);
    }
  }, [searchParams, address]);

  // Network Switch Enforcement
  useEffect(() => {
    if (isConnected && chainId !== 56 && switchChain) {
      switchChain({ chainId: 56 });
    }
  }, [isConnected, chainId, switchChain]);

  // ----------------------------------------------------------------------
  // 1. LEGENDS SHARE MINT CONTRACT READS
  // ----------------------------------------------------------------------
  const { data: totalSharesSold, refetch: refetchSharesSold } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "totalSharesSold",
    chainId: 56,
  });

  const { data: currentSharePriceWei, refetch: refetchSharePrice } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "getCurrentSharePrice",
    chainId: 56,
  });

  const { data: liquidityUSDTReserve, refetch: refetchReserve } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityUSDTReserve",
    chainId: 56,
  });

  const { data: liquidityLaunched, refetch: refetchLaunched } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityLaunched",
    chainId: 56,
  });

  const { data: isLiquidityLocked } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "isLiquidityLocked",
    chainId: 56,
  });

  const { data: liquidityUnlockTimestamp } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityUnlockTimestamp",
    chainId: 56,
  });

  const { data: shareMintPaused, refetch: refetchSharePaused } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "mintPaused",
    chainId: 56,
  });

  const { data: shareOwner } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "owner",
    chainId: 56,
  });

  const { data: claimableTeamTokens } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "claimableTeamTokens",
    chainId: 56,
  });

  // Calculate live mint cost
  const { data: mintCostWei, refetch: refetchCost } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "calculateMintCost",
    args: [BigInt(Math.max(1, shareQty))],
    chainId: 56,
  });

  // User-specific Share Mint reads
  const { data: userSharesCount, refetch: refetchUserShares } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "userShares",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userClaimableTokens, refetch: refetchClaimableTokens } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "claimableTokens",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userReferrer } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "referrerOf",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userReferralCount, refetch: refetchRefStats } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "referralCount",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userReferralEarned, refetch: refetchRefEarned } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "referralUSDTEarned",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  // ----------------------------------------------------------------------
  // 2. USDT READS & ALLOWANCE
  // ----------------------------------------------------------------------
  const { data: usdtBalance, refetch: refetchUsdtBalance } = useReadContract({
    address: config.usdt,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: config.usdt,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, config.shareMint] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  // ----------------------------------------------------------------------
  // 3. AGENT LEGENDS NFT READS
  // ----------------------------------------------------------------------
  const { data: nftBalance, refetch: refetchNftBalance } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: nftTotalSupply, refetch: refetchNftSupply } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "totalSupply",
    chainId: 56,
  });

  const { data: nftFreeRem, refetch: refetchNftFreeRem } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "remainingFreeSupply",
    chainId: 56,
  });

  const { data: isAgenticWallet } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "isAgenticWalletUser",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: hasClaimedFreeNft, refetch: refetchNftClaimed } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "hasClaimedFree",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: nftWalletAllowance, refetch: refetchNftAllowance } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "remainingWalletAllowance",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: nftMintPaused } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "mintPaused",
    chainId: 56,
  });

  // Native BNB balance
  const { data: bnbBalance, refetch: refetchBnbBalance } = useBalance({
    address,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  // Check if owner
  const isOwner = Boolean(
    address &&
      shareOwner &&
      address.toLowerCase() === shareOwner.toLowerCase()
  );

  // ----------------------------------------------------------------------
  // WRITE CONTRACT HOOK
  // ----------------------------------------------------------------------
  const {
    data: writeTxHash,
    error: writeError,
    isPending: isWritePending,
    writeContractAsync,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
    confirmations: 2,
  });

  const isBusy = isWritePending || isConfirming;

  // Refetch all contract state on success
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchSharesSold(),
      refetchSharePrice(),
      refetchReserve(),
      refetchLaunched(),
      refetchCost(),
      refetchUserShares(),
      refetchClaimableTokens(),
      refetchRefStats(),
      refetchRefEarned(),
      refetchUsdtBalance(),
      refetchAllowance(),
      refetchNftBalance(),
      refetchNftSupply(),
      refetchNftFreeRem(),
      refetchNftClaimed(),
      refetchNftAllowance(),
      refetchBnbBalance(),
      refetchSharePaused(),
    ]);
  }, [
    refetchSharesSold,
    refetchSharePrice,
    refetchReserve,
    refetchLaunched,
    refetchCost,
    refetchUserShares,
    refetchClaimableTokens,
    refetchRefStats,
    refetchRefEarned,
    refetchUsdtBalance,
    refetchAllowance,
    refetchNftBalance,
    refetchNftSupply,
    refetchNftFreeRem,
    refetchNftClaimed,
    refetchNftAllowance,
    refetchBnbBalance,
    refetchSharePaused,
  ]);

  useEffect(() => {
    if (isConfirmed && writeTxHash) {
      refetchAll();
    }
  }, [isConfirmed, writeTxHash, refetchAll]);

  // Load recent on-chain events for Activity & Leaderboard
  useEffect(() => {
    const client = createPublicClient({ chain: bsc, transport: http(config.rpcUrl) });
    async function loadLogs() {
      try {
        const latestBlock = await client.getBlockNumber();
        const fromBlock = latestBlock > 20000n ? latestBlock - 20000n : 0n;

        const [mintLogs, refLogs] = await Promise.all([
          client.getLogs({
            address: config.shareMint,
            event: {
              type: "event",
              name: "SharesMinted",
              inputs: [
                { name: "buyer", type: "address", indexed: true },
                { name: "referrer", type: "address", indexed: true },
                { name: "sharesAmount", type: "uint256", indexed: false },
                { name: "totalCost", type: "uint256", indexed: false },
                { name: "newTotalShares", type: "uint256", indexed: false },
              ],
            },
            fromBlock,
          }),
          client.getLogs({
            address: config.shareMint,
            event: {
              type: "event",
              name: "ReferralPaid",
              inputs: [
                { name: "referrer", type: "address", indexed: true },
                { name: "referee", type: "address", indexed: true },
                { name: "commissionAmount", type: "uint256", indexed: false },
                { name: "cashbackAmount", type: "uint256", indexed: false },
              ],
            },
            fromBlock,
          }),
        ]);

        const items: ActivityItem[] = [];
        for (const log of mintLogs.slice(-10).reverse()) {
          items.push({
            id: `mint-${log.transactionHash}-${log.logIndex}`,
            type: "MINT",
            account: log.args.buyer || "",
            detail: `Minted ${log.args.sharesAmount?.toString()} Shares (${parseFloat(formatUnits(log.args.totalCost || 0n, 18)).toFixed(2)} USDT)`,
            txHash: log.transactionHash,
          });
        }
        for (const log of refLogs.slice(-10).reverse()) {
          items.push({
            id: `ref-${log.transactionHash}-${log.logIndex}`,
            type: "REFERRAL",
            account: log.args.referrer || "",
            detail: `Earned ${parseFloat(formatUnits(log.args.commissionAmount || 0n, 18)).toFixed(2)} USDT Commission`,
            txHash: log.transactionHash,
          });
        }
        setActivities(items);
      } catch (err) {
        console.warn("Could not query BSC event logs:", err);
      }
    }
    loadLogs();
  }, [config.rpcUrl, config.shareMint]);

  // Calculations for Share Mint
  const sharesSoldNum = totalSharesSold !== undefined ? Number(totalSharesSold) : 0;
  const currentPriceFormatted = currentSharePriceWei
    ? parseFloat(formatUnits(currentSharePriceWei, 18)).toFixed(4)
    : "0.5000";

  const reserveFormatted = liquidityUSDTReserve
    ? parseFloat(formatUnits(liquidityUSDTReserve, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";

  const costFormatted = mintCostWei
    ? parseFloat(formatUnits(mintCostWei, 18)).toFixed(4)
    : (shareQty * 0.5).toFixed(4);

  // maxUSDTIn with 1% slippage buffer
  const maxUSDTInWei = mintCostWei
    ? (mintCostWei * 101n) / 100n
    : parseUnits((shareQty * 0.505).toString(), 18);

  const isApproved = usdtAllowance !== undefined && mintCostWei !== undefined && usdtAllowance >= maxUSDTInWei;

  // Referral tier calculation
  const holdsNft = nftBalance !== undefined && nftBalance > 0n;
  const refCommissionRate = holdsNft ? "15%" : "10%";
  const hasReferrer = referrerAddress && isAddress(referrerAddress) && referrerAddress !== ZERO_ADDRESS;

  // Handle Share Quantity change
  const handleSetShareQty = (val: number) => {
    const valid = Math.max(1, Math.min(100000 - sharesSoldNum, val));
    setShareQty(valid);
    setCustomQtyInput(valid.toString());
  };

  // ----------------------------------------------------------------------
  // WRITE ACTIONS: SHARES
  // ----------------------------------------------------------------------
  const handleApproveUSDT = async () => {
    setActionError(null);
    if (!address) return;
    try {
      await writeContractAsync({
        address: config.usdt,
        account: address,
        chain: bsc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [config.shareMint, maxUSDTInWei * 10n], // Approve 10x buffer for convenience
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "USDT approval failed.");
    }
  };

  const handleBuyShares = async () => {
    setActionError(null);
    if (!address) return;
    if (shareMintPaused) {
      setActionError("Share minting is currently paused on-chain.");
      return;
    }
    if (usdtBalance && usdtBalance < maxUSDTInWei) {
      setActionError(`Insufficient USDT balance. Need at least ${costFormatted} USDT.`);
      return;
    }

    try {
      const targetReferrer = (isAddress(referrerAddress) && referrerAddress !== address)
        ? getAddress(referrerAddress)
        : ZERO_ADDRESS;

      await writeContractAsync({
        address: config.shareMint,
        account: address,
        chain: bsc,
        abi: SHARE_MINT_ABI,
        functionName: "buyShares",
        args: [BigInt(shareQty), targetReferrer, maxUSDTInWei],
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Share mint transaction failed.");
    }
  };

  const handleClaimTokens = async () => {
    setActionError(null);
    if (!address) return;
    try {
      await writeContractAsync({
        address: config.shareMint,
        account: address,
        chain: bsc,
        abi: SHARE_MINT_ABI,
        functionName: "claimTokens",
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Token claim failed.");
    }
  };

  // ----------------------------------------------------------------------
  // WRITE ACTIONS: NFTS
  // ----------------------------------------------------------------------
  const handleClaimFreeNft = async () => {
    setActionError(null);
    if (!address) return;
    if (!isAgenticWallet) {
      setActionError("Your wallet does not hold a Binance SPACE ID Agent ID (.ai).");
      return;
    }
    if (hasClaimedFreeNft) {
      setActionError("You have already claimed your 1 Free Agent NFT.");
      return;
    }
    try {
      await writeContractAsync({
        address: config.nft,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "claimFreeNFT",
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Free NFT claim failed.");
    }
  };

  const handleMintPaidNft = async () => {
    setActionError(null);
    if (!address) return;
    const allowed = nftWalletAllowance !== undefined ? Number(nftWalletAllowance) : 10;
    if (nftQty > allowed) {
      setActionError(`You can mint at most ${allowed} more NFT(s).`);
      return;
    }
    const totalBnbWei = BigInt(nftQty) * NFT_PAID_PRICE_WEI;
    if (bnbBalance && bnbBalance.value < totalBnbWei) {
      setActionError("Insufficient BNB balance to pay the 0.0005 BNB/NFT fee.");
      return;
    }

    try {
      await writeContractAsync({
        address: config.nft,
        account: address,
        chain: bsc,
        abi: NFT_ABI,
        functionName: "mintPaid",
        args: [BigInt(nftQty)],
        value: totalBnbWei,
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Paid NFT mint failed.");
    }
  };

  // Copy Referral URL
  const copyReferralUrl = () => {
    if (!address) return;
    const url = `https://agent.agentlegends.workers.dev/?ref=${address}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Owner Admin Handlers
  const handleLaunchPancake = async () => {
    if (!isOwner || !address) return;
    setAdminStatus(null);
    try {
      await writeContractAsync({
        address: config.shareMint,
        account: address,
        chain: bsc,
        abi: SHARE_MINT_ABI,
        functionName: "launchPancakePool",
        args: [BigInt(initialLockDays)],
      });
      setAdminStatus({ text: "PancakeSwap Pool launch transaction submitted.", isError: false });
    } catch (err: unknown) {
      setAdminStatus({ text: err instanceof Error ? err.message : "Pool launch failed.", isError: true });
    }
  };

  const handleClaimTeamTokens = async () => {
    if (!isOwner || !address || !isAddress(teamRecipient)) return;
    setAdminStatus(null);
    try {
      await writeContractAsync({
        address: config.shareMint,
        account: address,
        chain: bsc,
        abi: SHARE_MINT_ABI,
        functionName: "claimTeamTokens",
        args: [teamRecipient as `0x${string}`],
      });
      setAdminStatus({ text: "Team tokens claim submitted.", isError: false });
    } catch (err: unknown) {
      setAdminStatus({ text: err instanceof Error ? err.message : "Team token claim failed.", isError: true });
    }
  };

  const handleToggleSharePause = async () => {
    if (!isOwner || !address) return;
    setAdminStatus(null);
    try {
      await writeContractAsync({
        address: config.shareMint,
        account: address,
        chain: bsc,
        abi: SHARE_MINT_ABI,
        functionName: "setMintPaused",
        args: [!shareMintPaused],
      });
      setAdminStatus({ text: "Toggle share mint pause submitted.", isError: false });
    } catch (err: unknown) {
      setAdminStatus({ text: err instanceof Error ? err.message : "Toggle pause failed.", isError: true });
    }
  };

  const errorMessage = actionError || writeError?.message;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 font-mono">
      {/* Network Alert */}
      {isConnected && !isBscMainnet && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              Wrong network detected. Agent Legends is live on <strong>BNB Smart Chain Mainnet (Chain ID: 56)</strong>.
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

      {/* Terminal Mode Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab("SHARES");
              setActionError(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "SHARES"
                ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Coins className="w-4 h-4 text-violet-300" />
            <span>$LEGENDS BONDING CURVE SHARES</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-white font-black">
              ACTIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("NFTS");
              setActionError(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "NFTS"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AGENT LEGENDS NFT (2,000 CAP)</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: $LEGENDS BONDING CURVE SHARE MINT */}
      {/* ==================================================================== */}
      {activeTab === "SHARES" && (
        <div className="space-y-8">
          {/* Top Bonding Curve HUD Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Current Share Price</span>
              <div className="text-xl sm:text-2xl font-black text-violet-300">
                ${currentPriceFormatted} <span className="text-xs font-normal text-slate-400">USDT</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Starts $0.50 (+0.0001/share)</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total Shares Sold</span>
              <div className="text-xl sm:text-2xl font-black text-white">
                {sharesSoldNum.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ 100,000</span>
              </div>
              <span className="text-[10px] text-slate-500 block">1 Share = 4,500 $LEGENDS</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Liquidity Reserve</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                ${reserveFormatted} <span className="text-xs font-normal text-slate-400">USDT</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Locked for PancakeSwap Pool</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">PancakeSwap Status</span>
              <div className="text-xl sm:text-2xl font-black">
                {liquidityLaunched ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 text-lg">
                    <CheckCircle2 className="w-5 h-5" /> LAUNCHED
                  </span>
                ) : (
                  <span className="text-amber-400 text-lg">
                    {Math.max(0, PANCAKE_LAUNCH_THRESHOLD - sharesSoldNum).toLocaleString()} Left
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block">Threshold: 10,000 Shares</span>
            </div>
          </div>

          {/* PancakeSwap Liquidity Launch Progress Bar */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-white font-bold uppercase tracking-wider">PancakeSwap LP Launch Progress</span>
                <span className="text-slate-400">({sharesSoldNum} / 10,000 Shares)</span>
              </div>
              <span className="text-violet-300 font-bold">
                {((Math.min(PANCAKE_LAUNCH_THRESHOLD, sharesSoldNum) / PANCAKE_LAUNCH_THRESHOLD) * 100).toFixed(1)}% Achieved
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-700 shadow-md shadow-violet-500/20"
                style={{ width: `${Math.min(100, (sharesSoldNum / PANCAKE_LAUNCH_THRESHOLD) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              * Once 10,000 shares are minted, the engine automatically launches the official PancakeSwap V2 pool with 100% of accumulated USDT + 45,000,000 $LEGENDS.
            </p>
          </div>

          {/* Main Share Minting Terminal Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border border-violet-500/30 bg-slate-950/80 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    Mint $LEGENDS Shares
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Balance: <strong className="text-white">{usdtBalance ? parseFloat(formatUnits(usdtBalance, 18)).toFixed(2) : "0.00"} USDT</strong>
                </span>
              </div>

              {/* Referrer Cashback Badge */}
              {hasReferrer && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <strong>5% Instant USDT Cashback Active!</strong>
                  </span>
                  <span className="text-[11px] text-emerald-400/80 truncate max-w-[140px]">
                    via {referrerAddress.slice(0, 6)}...{referrerAddress.slice(-4)}
                  </span>
                </div>
              )}

              {/* Quantity Preset Selectors */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Select Share Quantity:</span>
                  <span>1 Share = 4,500 $LEGENDS</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[1, 10, 50, 100].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSetShareQty(q)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        shareQty === q
                          ? "bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-500/20"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {q} {q === 1 ? "Share" : "Shares"}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400">Custom Qty:</span>
                  <input
                    type="number"
                    min="1"
                    max={100000 - sharesSoldNum}
                    value={customQtyInput}
                    onChange={(e) => {
                      setCustomQtyInput(e.target.value);
                      const parsed = parseInt(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) setShareQty(parsed);
                    }}
                    className="flex-1 bg-transparent text-white font-bold text-sm focus:outline-none"
                    placeholder="Enter quantity"
                  />
                  <span className="text-xs text-slate-500">Shares</span>
                </div>
              </div>

              {/* Mint Cost Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Tokens Received at Launch:</span>
                  <span className="text-white font-bold">{(shareQty * TOKENS_PER_SHARE).toLocaleString()} $LEGENDS</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Mint Cost:</span>
                  <span className="text-violet-300 font-bold">${costFormatted} USDT</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Max Slippage Limit (+1%):</span>
                  <span className="text-slate-300">{parseFloat(formatUnits(maxUSDTInWei, 18)).toFixed(4)} USDT</span>
                </div>
              </div>

              {/* 2-Step Action Button */}
              {!isConnected ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  Connect your wallet above to mint $LEGENDS shares.
                </p>
              ) : !isApproved ? (
                <button
                  type="button"
                  onClick={handleApproveUSDT}
                  disabled={isBusy}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  <span>Step 1: Approve USDT for Share Mint</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBuyShares}
                  disabled={isBusy || Boolean(shareMintPaused)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isBusy ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Minting {shareQty} Shares...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Step 2: Mint {shareQty} Shares · {costFormatted} USDT</span>
                    </>
                  )}
                </button>
              )}

              {/* Error feedback */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Right Column: User Position & Claim & Referral */}
            <div className="lg:col-span-5 space-y-6">
              {/* User Position & Claim Card */}
              <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-950/70 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" /> Your Holdings
                  </span>
                  <span className="text-[10px] text-slate-500">Live on BSC</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Your Shares</span>
                    <span className="text-lg font-black text-white">{userSharesCount !== undefined ? userSharesCount.toString() : "0"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Claimable Tokens</span>
                    <span className="text-lg font-black text-emerald-400">{userClaimableTokens !== undefined ? formatUnits(userClaimableTokens, 18) : "0"}</span>
                  </div>
                </div>

                {/* Claim or Swap Link */}
                {liquidityLaunched ? (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClaimTokens}
                      disabled={isBusy || !userClaimableTokens || userClaimableTokens === 0n}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-40"
                    >
                      Claim {userClaimableTokens ? formatUnits(userClaimableTokens, 18) : "0"} $LEGENDS
                    </button>
                    <a
                      href={`https://pancakeswap.finance/swap?outputCurrency=${config.token}&inputCurrency=${config.usdt}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Trade on PancakeSwap DEX</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    Token claim & PancakeSwap trading unlock when 10,000 shares threshold is reached.
                  </div>
                )}
              </div>

              {/* Referral Dashboard Card */}
              <div className="glass-panel p-6 rounded-3xl border border-[#00FF66]/30 bg-slate-950/70 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#00FF66]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Referral Dashboard</span>
                  </div>
                  {/* Dynamic Tier Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${
                    holdsNft
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}>
                    {holdsNft ? "👑 15% NFT BOOSTED" : "10% Standard Rate"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Referred Users</span>
                    <span className="text-lg font-black text-white">{userReferralCount !== undefined ? userReferralCount.toString() : "0"}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Instant USDT Earned</span>
                    <span className="text-lg font-black text-[#00FF66]">
                      ${userReferralEarned !== undefined ? parseFloat(formatUnits(userReferralEarned, 18)).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>

                {/* Referral Link Box */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Your Referral Link (Gives referees 5% cashback):</span>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 truncate text-[11px]">
                      {address ? `https://agent.agentlegends.workers.dev/?ref=${address}` : "Connect wallet to view"}
                    </div>
                    <button
                      type="button"
                      onClick={copyReferralUrl}
                      disabled={!address}
                      className="px-3.5 py-2 rounded-xl bg-[#00FF66] hover:bg-[#00CC52] text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-40 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Activity & Leaderboard Feed */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-950/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Live On-Chain Share Terminal Activity (BSC Mainnet)</span>
              </div>
              <span className="text-[10px] text-slate-500">Real-Time Event Stream</span>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Waiting for recent share mint events... Mint the first shares to appear here!
              </p>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.type === "MINT" ? "bg-violet-500/20 text-violet-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {act.type}
                      </span>
                      <span className="text-white font-bold">{act.account.slice(0, 6)}...{act.account.slice(-4)}</span>
                      <span className="text-slate-400">{act.detail}</span>
                    </div>
                    <a
                      href={`https://bscscan.com/tx/${act.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[11px]"
                    >
                      <span>BscScan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AGENT LEGENDS NFT MINT */}
      {/* ==================================================================== */}
      {activeTab === "NFTS" && (
        <div className="space-y-8">
          {/* Dual NFT Mint Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Free .ai Agent ID Claim */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950/80 space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SPACE ID (.ai) AGENTS
                </span>
                <span className="text-xs text-slate-400">
                  {nftFreeRem !== undefined ? nftFreeRem.toString() : "996"} / 1,000 Left
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                  1 Free Agent ID Mint
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reserved exclusively for wallets holding a SPACE ID Binance Agent ID (<code className="text-emerald-300">.ai</code>). Zero mint price (0 BNB + gas).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Agent ID Status:</span>
                  <span className={isAgenticWallet ? "text-emerald-400 font-bold" : "text-slate-400"}>
                    {isAgenticWallet ? "Verified .ai Holder" : "Unverified (Standard Wallet)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Claim Allowance:</span>
                  <span className="text-white font-bold">{hasClaimedFreeNft ? "Claimed (1/1)" : "1 Free NFT Available"}</span>
                </div>
              </div>

              {!isConnected ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  Connect your wallet to check your free Agent ID claim eligibility.
                </p>
              ) : hasClaimedFreeNft ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold">
                  You have claimed your free Agent Legend!
                </div>
              ) : !isAgenticWallet ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                  This wallet does not hold a Binance Agent ID (.ai). You can mint via the <strong>Public Paid Mint</strong> on the right.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimFreeNft}
                  disabled={isBusy || Boolean(nftMintPaused)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Claim 1 Free NFT (0 BNB)</span>
                </button>
              )}
            </div>

            {/* Card 2: Public Paid Mint */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-slate-950/80 space-y-6">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  PUBLIC COLLECTORS
                </span>
                <span className="text-xs text-slate-400">
                  Total: {nftTotalSupply !== undefined ? nftTotalSupply.toString() : "4"} / 2,000
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">
                  Public Paid Mint
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Open to all wallets at 0.0005 BNB each. Up to 10 NFTs total per wallet.
                </p>
              </div>

              {/* Quantity selector */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNftQty((q) => Math.max(1, q - 1))}
                      disabled={nftQty <= 1 || isBusy}
                      className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-lg font-black text-white px-2">{nftQty}</span>
                    <button
                      type="button"
                      onClick={() => setNftQty((q) => Math.min(10, q + 1))}
                      disabled={nftQty >= 10 || isBusy}
                      className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Total Cost:</span>
                  <span className="text-violet-300 font-bold">{(nftQty * 0.0005).toFixed(4)} BNB</span>
                </div>
              </div>

              {!isConnected ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  Connect your wallet to mint Agent Legends NFTs.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleMintPaidNft}
                  disabled={isBusy || Boolean(nftMintPaused)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Mint Paid NFTs ({nftQty} for {(nftQty * 0.0005).toFixed(4)} BNB)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OWNER ADMIN PANEL */}
      {/* ==================================================================== */}
      {isOwner && (
        <div className="p-6 sm:p-8 rounded-3xl border border-amber-500/40 bg-slate-950/95 space-y-6 text-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Settings className="w-5 h-5" />
              <span>CONTRACT OWNER ADMIN PANEL</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>

          {adminStatus && (
            <div className={`p-3.5 rounded-xl flex items-center gap-2 ${
              adminStatus.isError ? "bg-red-500/10 border border-red-500/30 text-red-300" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
            }`}>
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{adminStatus.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Launch PancakeSwap Pool */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-white font-bold block">1. Launch PancakeSwap LP</span>
              <p className="text-[11px] text-slate-400">
                Initial LP Lock Days:
              </p>
              <input
                type="number"
                value={initialLockDays}
                onChange={(e) => setInitialLockDays(parseInt(e.target.value) || 365)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <button
                type="button"
                onClick={handleLaunchPancake}
                disabled={isBusy || Boolean(liquidityLaunched)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors disabled:opacity-40"
              >
                {liquidityLaunched ? "Pool Already Launched" : "Launch PancakeSwap Pool"}
              </button>
            </div>

            {/* 2. Claim Vested Team Tokens */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-white font-bold block">2. Claim Team Tokens</span>
              <p className="text-[11px] text-slate-400">
                Claimable: {claimableTeamTokens ? formatUnits(claimableTeamTokens, 18) : "0"} $LEGENDS
              </p>
              <input
                type="text"
                placeholder="Recipient Address (0x...)"
                value={teamRecipient}
                onChange={(e) => setTeamRecipient(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
              <button
                type="button"
                onClick={handleClaimTeamTokens}
                disabled={isBusy || !isAddress(teamRecipient)}
                className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold transition-colors disabled:opacity-40"
              >
                Claim Team Tokens
              </button>
            </div>

            {/* 3. Toggle Share Mint Pause */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-white font-bold block">3. Toggle Pause Status</span>
              <p className="text-[11px] text-slate-400">
                Current: <strong className={shareMintPaused ? "text-red-400" : "text-emerald-400"}>{shareMintPaused ? "PAUSED" : "ACTIVE"}</strong>
              </p>
              <button
                type="button"
                onClick={handleToggleSharePause}
                disabled={isBusy}
                className={`w-full py-2.5 rounded-xl font-bold transition-colors ${
                  shareMintPaused
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                {shareMintPaused ? "Unpause Minting" : "Pause Minting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
