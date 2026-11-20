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
  Award,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
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
  Table,
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

// Generate the 10 representative milestones for the Tiered Pricing curve
const PRICING_TIERS = [
  { tier: 1, start: 0, end: 10000, price: 0.5000, label: "0 - 10,000", note: "PancakeSwap LP Pool opens at 10,000 shares" },
  { tier: 2, start: 10001, end: 20000, price: 1.5000, label: "10,001 - 20,000", note: "Post-launch bonding curve" },
  { tier: 3, start: 20001, end: 30000, price: 2.5000, label: "20,001 - 30,000", note: "Growth acceleration" },
  { tier: 4, start: 30001, end: 40000, price: 3.5000, label: "30,001 - 40,000", note: "High demand curve" },
  { tier: 5, start: 40001, end: 50000, price: 4.5000, label: "40,001 - 50,000", note: "Midpoint milestone" },
  { tier: 6, start: 50001, end: 60000, price: 5.5000, label: "50,001 - 60,000", note: "Ecosystem expansion" },
  { tier: 7, start: 60001, end: 70000, price: 6.5000, label: "60,001 - 70,000", note: "Advanced syndicate tier" },
  { tier: 8, start: 70001, end: 80000, price: 7.5000, label: "70,001 - 80,000", note: "Mature curve stage" },
  { tier: 9, start: 80001, end: 90000, price: 8.5000, label: "80,001 - 90,000", note: "Final allocation phase" },
  { tier: 10, start: 90001, end: 100000, price: 10.4999, label: "90,001 - 100,000", note: "1% DEX tax activates at 100k shares" },
];

export function AgenticTerminal({ defaultTab = "SHARES" }: { defaultTab?: "SHARES" | "NFTS" | "REFERRALS" | "PRICING" | "LEADERBOARD" } = {}) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const searchParams = useSearchParams();

  // Active Terminal Tab
  const [activeTab, setActiveTab] = useState<"SHARES" | "NFTS" | "REFERRALS" | "PRICING" | "LEADERBOARD">(() => {
    const tabParam = searchParams.get("tab")?.toUpperCase();
    if (tabParam === "NFTS" || tabParam === "NFT") return "NFTS";
    if (tabParam === "REFERRALS" || tabParam === "REF" || tabParam === "EARN") return "REFERRALS";
    if (tabParam === "PRICING" || tabParam === "TIERS") return "PRICING";
    if (tabParam === "LEADERBOARD") return "LEADERBOARD";
    return defaultTab;
  });

  // Leaderboard sub-filters
  const [lbCategory, setLbCategory] = useState<"INVITES" | "MINTS" | "HOLDERS" | "AMBASSADORS">("INVITES");
  const [lbPeriod, setLbPeriod] = useState<"DAY" | "WEEK" | "ALL">("WEEK");

  // Share Mint Inputs
  const [shareQty, setShareQty] = useState<number>(10);
  const [customQtyInput, setCustomQtyInput] = useState<string>("10");
  const [referrerAddress, setReferrerAddress] = useState<string>(ZERO_ADDRESS);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // NFT Mint Inputs
  const [nftQty, setNftQty] = useState<number>(1);

  // Owner Admin inputs
  const [adminStatus, setAdminStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [teamRecipient, setTeamRecipient] = useState<string>("");
  const [initialLockDays, setInitialLockDays] = useState<number>(365);

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

  const { data: currentSharePrice, refetch: refetchPrice } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "getCurrentSharePrice",
    chainId: 56,
  });

  const { data: mintCostWei } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "calculateMintCost",
    args: [BigInt(shareQty > 0 ? shareQty : 1)],
    chainId: 56,
  });

  const { data: liquidityUSDTReserve } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityUSDTReserve",
    chainId: 56,
  });

  const { data: liquidityLaunched } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "liquidityLaunched",
    chainId: 56,
  });

  const { data: shareMintPaused } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "mintPaused",
    chainId: 56,
  });

  const { data: contractOwner } = useReadContract({
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

  // User-specific Share Reads
  const { data: userSharesCount, refetch: refetchUserShares } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "userShares",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userClaimableTokens, refetch: refetchUserClaimable } = useReadContract({
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

  const { data: userReferralCount } = useReadContract({
    address: config.shareMint,
    abi: SHARE_MINT_ABI,
    functionName: "referralCount",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: userReferralEarned } = useReadContract({
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

  const { data: usdtAllowance, refetch: refetchUsdtAllowance } = useReadContract({
    address: config.usdt,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, config.shareMint] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  // ----------------------------------------------------------------------
  // 3. NFT READS (AGENT LEGENDS)
  // ----------------------------------------------------------------------
  const { data: nftTotalSupply, refetch: refetchNftSupply } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "totalSupply",
    chainId: 56,
  });

  const { data: nftFreeRem } = useReadContract({
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

  const { data: hasClaimedFreeNft, refetch: refetchClaimedFree } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "hasClaimedFree",
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled: Boolean(address) },
  });

  const { data: nftBalance, refetch: refetchNftBalance } = useReadContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "balanceOf",
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

  // ----------------------------------------------------------------------
  // DERIVED STATE
  // ----------------------------------------------------------------------
  const holdsNft = nftBalance !== undefined && Number(nftBalance) > 0;
  const isOwner = Boolean(
    address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase()
  );

  const sharesSoldNum = totalSharesSold !== undefined ? Number(totalSharesSold) : 0;
  const currentPriceFormatted = currentSharePrice
    ? parseFloat(formatUnits(currentSharePrice, 18)).toFixed(4)
    : "0.5000";

  // Calculate 1% slippage buffer for USDT max cost
  const maxUSDTInWei = useMemo(() => {
    if (!mintCostWei) return 0n;
    return (mintCostWei * 101n) / 100n;
  }, [mintCostWei]);

  const isApproved = useMemo(() => {
    if (!usdtAllowance || !maxUSDTInWei || maxUSDTInWei === 0n) return false;
    return usdtAllowance >= maxUSDTInWei;
  }, [usdtAllowance, maxUSDTInWei]);

  const costFormatted = mintCostWei
    ? parseFloat(formatUnits(mintCostWei, 18)).toFixed(4)
    : (shareQty * 0.5).toFixed(4);

  const hasReferrer = referrerAddress !== ZERO_ADDRESS && isAddress(referrerAddress);

  // Active pricing tier calculation
  const currentActiveTier = useMemo(() => {
    const found = PRICING_TIERS.find((t) => sharesSoldNum >= t.start && sharesSoldNum <= t.end);
    return found ? found.tier : 1;
  }, [sharesSoldNum]);

  // ----------------------------------------------------------------------
  // WRITE CONTRACT HOOKS
  // ----------------------------------------------------------------------
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: writeBuyShares,
    data: buyTxHash,
    isPending: isBuying,
    error: buyError,
  } = useWriteContract();

  const {
    writeContract: writeClaimTokens,
    data: claimTxHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();

  const {
    writeContract: writeClaimFreeNft,
    data: claimNftTxHash,
    isPending: isClaimingNft,
    error: claimNftError,
  } = useWriteContract();

  const {
    writeContract: writeMintPaidNft,
    data: mintPaidTxHash,
    isPending: isMintingPaidNft,
    error: mintPaidError,
  } = useWriteContract();

  // Owner Write Actions
  const { writeContract: writeAdminAction, isPending: isAdminPending } = useWriteContract();

  // Receipt Watchers
  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { isLoading: isWaitingBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({
    hash: buyTxHash,
  });

  const { isLoading: isWaitingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash,
  });

  const { isLoading: isWaitingNftClaim, isSuccess: isNftClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimNftTxHash,
  });

  const { isLoading: isWaitingNftPaid, isSuccess: isNftPaidSuccess } = useWaitForTransactionReceipt({
    hash: mintPaidTxHash,
  });

  // Re-fetch state on successes
  useEffect(() => {
    if (isApproveSuccess) refetchUsdtAllowance();
  }, [isApproveSuccess, refetchUsdtAllowance]);

  useEffect(() => {
    if (isBuySuccess) {
      refetchSharesSold();
      refetchPrice();
      refetchUserShares();
      refetchUsdtBalance();
      refetchUsdtAllowance();
      setActionError(null);
    }
  }, [isBuySuccess, refetchSharesSold, refetchPrice, refetchUserShares, refetchUsdtBalance, refetchUsdtAllowance]);

  useEffect(() => {
    if (isClaimSuccess) {
      refetchUserClaimable();
    }
  }, [isClaimSuccess, refetchUserClaimable]);

  useEffect(() => {
    if (isNftClaimSuccess || isNftPaidSuccess) {
      refetchNftSupply();
      refetchClaimedFree();
      refetchNftBalance();
    }
  }, [isNftClaimSuccess, isNftPaidSuccess, refetchNftSupply, refetchClaimedFree, refetchNftBalance]);

  // Handlers
  const handleSetShareQty = (qty: number) => {
    const valid = Math.max(1, Math.min(100000 - sharesSoldNum, qty));
    setShareQty(valid);
    setCustomQtyInput(valid.toString());
  };

  const handleApproveUSDT = () => {
    if (!address) return;
    setActionError(null);
    try {
      writeApprove({
        address: config.usdt,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [config.shareMint, maxUSDTInWei * 2n], // approve with buffer
        chainId: 56,
      } as any);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Approval transaction failed.");
    }
  };

  const handleBuyShares = () => {
    if (!address) return;
    setActionError(null);
    try {
      writeBuyShares({
        address: config.shareMint,
        abi: SHARE_MINT_ABI,
        functionName: "buyShares",
        args: [BigInt(shareQty), (referrerAddress as `0x${string}`) || ZERO_ADDRESS, maxUSDTInWei],
        chainId: 56,
      } as any);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Mint transaction failed.");
    }
  };

  const handleClaimTokens = () => {
    if (!address) return;
    try {
      writeClaimTokens({
        address: config.shareMint,
        abi: SHARE_MINT_ABI,
        functionName: "claimTokens",
        chainId: 56,
      } as any);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Claim tokens transaction failed.");
    }
  };

  const handleClaimFreeNft = () => {
    if (!address) return;
    try {
      writeClaimFreeNft({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "claimFreeNFT",
        chainId: 56,
      } as any);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Free claim transaction failed.");
    }
  };

  const handleMintPaidNft = () => {
    if (!address) return;
    try {
      const totalWei = NFT_PAID_PRICE_WEI * BigInt(nftQty);
      writeMintPaidNft({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "mintPaid",
        args: [BigInt(nftQty)],
        value: totalWei,
        chainId: 56,
      } as any);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Paid mint transaction failed.");
    }
  };

  // Owner admin actions
  const handleLaunchPancake = () => {
    writeAdminAction({
      address: config.shareMint,
      abi: SHARE_MINT_ABI,
      functionName: "launchPancakePool",
      args: [BigInt(initialLockDays)],
      chainId: 56,
    } as any);
  };

  const handleClaimTeamTokens = () => {
    if (!isAddress(teamRecipient)) return;
    writeAdminAction({
      address: config.shareMint,
      abi: SHARE_MINT_ABI,
      functionName: "claimTeamTokens",
      args: [teamRecipient as `0x${string}`],
      chainId: 56,
    } as any);
  };

  const copyReferralUrl = () => {
    if (!address) return;
    const url = `https://agent.agentlegends.workers.dev/?ref=${address}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isBusy =
    isApproving ||
    isWaitingApprove ||
    isBuying ||
    isWaitingBuy ||
    isClaiming ||
    isWaitingClaim ||
    isClaimingNft ||
    isWaitingNftClaim ||
    isMintingPaidNft ||
    isWaitingNftPaid ||
    isAdminPending;

  const errorMessage =
    actionError ||
    (approveError ? approveError.message : null) ||
    (buyError ? buyError.message : null) ||
    (claimError ? claimError.message : null) ||
    (claimNftError ? claimNftError.message : null) ||
    (mintPaidError ? mintPaidError.message : null);

  // Poll BSC logs for activity stream
  useEffect(() => {
    let unmounted = false;
    const client = createPublicClient({
      chain: bsc,
      transport: http("https://bsc-dataseed.binance.org/"),
    });

    async function loadLogs() {
      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

        const [mintLogs, refLogs] = await Promise.all([
          client.getLogs({
            address: config.shareMint,
            event: {
              type: "event",
              name: "SharesMinted",
              inputs: [
                { type: "address", name: "buyer", indexed: true },
                { type: "address", name: "referrer", indexed: true },
                { type: "uint256", name: "sharesAmount" },
                { type: "uint256", name: "totalCost" },
                { type: "uint256", name: "newTotalShares" },
              ],
            },
            fromBlock,
            toBlock: "latest",
          }),
          client.getLogs({
            address: config.shareMint,
            event: {
              type: "event",
              name: "ReferralPaid",
              inputs: [
                { type: "address", name: "referrer", indexed: true },
                { type: "address", name: "referee", indexed: true },
                { type: "uint256", name: "commissionAmount" },
                { type: "uint256", name: "cashbackAmount" },
              ],
            },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        if (unmounted) return;

        const parsedMint: ActivityItem[] = mintLogs.map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "MINT",
          account: (log.args as any).buyer || "",
          detail: `Minted ${Number((log.args as any).sharesAmount || 0)} Shares for $${(
            Number((log.args as any).totalCost || 0) / 1e18
          ).toFixed(2)} USDT`,
          txHash: log.transactionHash,
        }));

        const parsedRef: ActivityItem[] = refLogs.map((log) => ({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: "REFERRAL",
          account: (log.args as any).referrer || "",
          detail: `Earned $${(Number((log.args as any).commissionAmount || 0) / 1e18).toFixed(
            2
          )} USDT (+5% Cashback Paid)`,
          txHash: log.transactionHash,
        }));

        const combined = [...parsedMint, ...parsedRef].slice(0, 10);
        setActivities(combined);
      } catch {
        // Fallback for RPC rate limit
      }
    }

    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => {
      unmounted = true;
      clearInterval(interval);
    };
  }, [config.shareMint]);

  return (
    <div className="space-y-10 font-mono text-xs">
      {/* ==================================================================== */}
      {/* 1. JAGER.LIVE INSPIRED TERMINAL TABS NAVIGATION */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("SHARES")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "SHARES"
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>$LEGENDS Shares</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("NFTS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "NFTS"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>NFT Recruitment (.ai Free)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REFERRALS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "REFERRALS"
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Invite & Earn USDT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PRICING")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "PRICING"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Tiered Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LEADERBOARD")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === "LEADERBOARD"
                ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* Live Network & Explorer Indicator */}
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BSC Mainnet</span>
          </span>
          <a
            href={`https://bscscan.com/address/${config.shareMint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 transition-colors"
          >
            <span>Contract</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: $LEGENDS BONDING CURVE SHARE MINT (JAGER.LIVE MINT PASS HERO) */}
      {/* ==================================================================== */}
      {activeTab === "SHARES" && (
        <div className="space-y-8">
          {/* Main 2-Column Terminal Layout: Left = Mint Pass, Right = Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ------------------------------------------------------------- */}
            {/* LEFT: THE SIGNATURE JAGER.LIVE MINT PASS GRADED CARD          */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-6 relative group">
              <div className="p-[2px] rounded-[32px] bg-gradient-to-b from-amber-400/40 via-violet-500/30 to-slate-800 shadow-2xl shadow-violet-950/40">
                <div className="p-6 sm:p-8 rounded-[30px] bg-slate-950/95 space-y-6 relative overflow-hidden">
                  {/* Holographic Watermark effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Bar of Pass */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/60 animate-pulse" />
                      <span className="font-black text-sm text-white tracking-widest uppercase">
                        $LEGENDS · MINT PASS
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-bold text-[10px] tracking-widest">
                      BSC · BEP-20
                    </span>
                  </div>

                  {/* Agentic Wallet Status Banner */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Agent ID Verification</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAgenticWallet
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {isAgenticWallet ? "✓ Verified .ai Agent" : "Standard Web3 Wallet"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {isAgenticWallet
                        ? "Your wallet is recognized as an autonomous Binance Agentic Wallet (.ai)."
                        : "Connect the Binance Agentic Wallet holding your .ai Agent ID to unlock exclusive rewards."}
                    </p>
                  </div>

                  {/* Graded Pass Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Current Tier</span>
                      <span className="text-xl font-black text-white">Tier {currentActiveTier}</span>
                      <span className="text-[10px] text-violet-300 font-bold block">${currentPriceFormatted} USDT</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Next Serial</span>
                      <span className="text-xl font-black text-amber-300">#{sharesSoldNum + 1}</span>
                      <span className="text-[10px] text-slate-400 block">Out of 100,000</span>
                    </div>
                  </div>

                  {/* You Receive Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 to-slate-900 border border-violet-500/30 space-y-2">
                    <span className="text-[10px] text-violet-300 uppercase tracking-widest font-bold block">
                      You Receive
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200 font-bold text-sm">Graded Collector Operative</span>
                      <span className="text-emerald-400 font-black text-sm">4,500 $LEGENDS / Share</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Tokens are held in the contract and unlock immediately upon PancakeSwap pool launch.
                    </p>
                  </div>

                  {/* Total Shares Progress Bar to 10,000 LP Launch */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Total Shares Minted:</span>
                      <span className="text-white font-bold">{sharesSoldNum.toLocaleString()} / 100,000</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden p-0.5">
                      <div
                        className="bg-gradient-to-r from-violet-500 via-indigo-500 to-amber-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, (sharesSoldNum / 10000) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>PancakeSwap threshold: 10,000 shares</span>
                      <span className="text-amber-400 font-bold">
                        {Math.max(0, 10000 - sharesSoldNum).toLocaleString()} Left to LP Launch
                      </span>
                    </div>
                  </div>

                  {/* Protocol Reserve Footnote */}
                  <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-4">
                    * 100% of accumulated USDT + 45,000,000 $LEGENDS automatically creates and seeds the official PancakeSwap V2 pool when 10,000 shares are sold.
                  </p>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT: INTERACTIVE MINTING CONTROLS & ACTIONS                 */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-6 space-y-6">
              <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-slate-800 bg-slate-950/90 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-black text-white uppercase tracking-wider">
                      Mint $LEGENDS Shares
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    USDT Balance: <strong className="text-white">{usdtBalance ? parseFloat(formatUnits(usdtBalance, 18)).toFixed(2) : "0.00"}</strong>
                  </span>
                </div>

                {/* 5% Instant Cashback Active Banner */}
                {hasReferrer && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <strong>5% Instant Cashback Activated!</strong>
                        <p className="text-[10px] text-emerald-400/80">Ref: {referrerAddress.slice(0, 6)}...{referrerAddress.slice(-4)}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      5% Refund
                    </span>
                  </div>
                )}

                {/* Share Quantity Selector Presets (1, 5, 10, Custom) */}
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Select Share Quantity:</span>
                    <span className="text-violet-300 font-bold">1 Share = 4,500 $LEGENDS</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 5, 10].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSetShareQty(q)}
                        className={`py-3.5 px-3 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                          shareQty === q
                            ? "bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-500/20"
                            : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-sm font-black">{q} {q === 1 ? "Share" : "Shares"}</span>
                        {q === 10 && (
                          <span className="text-[9px] text-amber-300 uppercase tracking-tighter font-extrabold">
                            ★ Max Rewards
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Quantity Input */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
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
                    <span className="text-xs text-slate-500 font-bold">Shares</span>
                  </div>
                </div>

                {/* Cost Breakdown Box */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Tokens Received at Launch:</span>
                    <span className="text-white font-bold">{(shareQty * TOKENS_PER_SHARE).toLocaleString()} $LEGENDS</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Mint Cost:</span>
                    <span className="text-violet-300 font-bold">${costFormatted} USDT</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Max Slippage Limit (+1% buffer):</span>
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
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    <span>Step 1: Approve USDT for Share Mint</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyShares}
                    disabled={isBusy || Boolean(shareMintPaused)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isBusy ? (
                      <>
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                        <span>Minting {shareQty} Shares...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Step 2: Mint {shareQty} Shares · ${costFormatted} USDT</span>
                      </>
                    )}
                  </button>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* User Position & Claim Card */}
              <div className="glass-panel p-6 rounded-[28px] border border-slate-800 bg-slate-950/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" /> Your Holdings & Claims
                  </span>
                  <span className="text-[10px] text-slate-500">Live on BSC</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Your Shares</span>
                    <span className="text-lg font-black text-white">{userSharesCount !== undefined ? userSharesCount.toString() : "0"}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase">Claimable Tokens</span>
                    <span className="text-lg font-black text-emerald-400">{userClaimableTokens !== undefined ? formatUnits(userClaimableTokens, 18) : "0"}</span>
                  </div>
                </div>

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
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    Tokens claim and PancakeSwap DEX trading automatically unlock when the 10,000 shares threshold is reached.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AGENT LEGENDS NFT MINT (.ai FREE + PAID)                       */}
      {/* ==================================================================== */}
      {activeTab === "NFTS" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Free .ai Agent ID Claim */}
            <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950/90 space-y-6">
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
                    {isAgenticWallet ? "✓ Verified .ai Holder" : "Unverified (Standard Wallet)"}
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
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold">
                  ✓ You have claimed your free Agent Legend!
                </div>
              ) : !isAgenticWallet ? (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                  This wallet does not hold a Binance Agent ID (.ai). You can mint via the <strong>Public Paid Mint</strong> on the right.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClaimFreeNft}
                  disabled={isBusy || Boolean(nftMintPaused)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isBusy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Claim 1 Free NFT (0 BNB)</span>
                </button>
              )}
            </div>

            {/* Card 2: Public Paid Mint */}
            <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-violet-500/30 bg-gradient-to-b from-violet-950/20 to-slate-950/90 space-y-6">
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
      {/* TAB 3: INVITE & EARN USDT (REFERRAL SYNDICATE)                        */}
      {/* ==================================================================== */}
      {activeTab === "REFERRALS" && (
        <div className="space-y-8">
          <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-amber-500/30 bg-slate-950/90 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Invite & Earn USDT Syndicate
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                holdsNft
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}>
                {holdsNft ? "👑 Super Ambassador (15%)" : "Ambassador (10%)"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Referred Operatives</span>
                <span className="text-2xl font-black text-white">{userReferralCount !== undefined ? userReferralCount.toString() : "0"}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Instant USDT Commission</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${userReferralEarned !== undefined ? parseFloat(formatUnits(userReferralEarned, 18)).toFixed(2) : "0.00"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">Referee Cashback Rate</span>
                <span className="text-2xl font-black text-amber-300">5% Instant</span>
              </div>
            </div>

            {/* Copyable Link Box */}
            <div className="space-y-2 pt-2">
              <span className="text-xs text-slate-400">Your Unique Syndicate Referral Link:</span>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 truncate text-xs select-all">
                  {address ? `https://agent.agentlegends.workers.dev/?ref=${address}` : "Connect wallet to view your link"}
                </div>
                <button
                  type="button"
                  onClick={copyReferralUrl}
                  disabled={!address}
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* How it Works Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-white font-bold block">1. 5% Instant Cashback for Referee</span>
                <p className="text-[11px] text-slate-400">
                  Any agent who mints shares through your link automatically receives a 5% instant USDT refund from the contract.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-white font-bold block">2. 10% to 15% Instant Commission</span>
                <p className="text-[11px] text-slate-400">
                  You earn 10% standard commission immediately in USDT. Hold 1+ Agent Legend NFT to upgrade to 15% Super Ambassador rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: TIERED PRICING TABLE (EXACT JAGER.LIVE SECTION)                */}
      {/* ==================================================================== */}
      {activeTab === "PRICING" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-slate-800 bg-slate-950/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Table className="w-5 h-5 text-sky-400" />
                  Tiered Pricing Curve
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Starts at $0.50 USDT up to 10,000 shares · Then rises +0.0001 USDT per share · PancakeSwap LP opens at 10,000 shares
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 font-bold text-xs border border-violet-500/30">
                Current Price: ${currentPriceFormatted} USDT
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 w-16">Tier</th>
                    <th className="pb-3">Share Allocation Range</th>
                    <th className="pb-3 text-center">Unit Price</th>
                    <th className="pb-3">Stage Description</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {PRICING_TIERS.map((tier) => {
                    const isCurrent = sharesSoldNum >= tier.start && sharesSoldNum <= tier.end;
                    const isCompleted = sharesSoldNum > tier.end;
                    return (
                      <tr
                        key={tier.tier}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          isCurrent ? "bg-violet-950/30" : ""
                        }`}
                      >
                        <td className="py-3.5 font-bold text-white">Tier {tier.tier}</td>
                        <td className="py-3.5 text-slate-300">{tier.label} Shares</td>
                        <td className="py-3.5 text-center font-bold text-emerald-400">
                          ${tier.price.toFixed(4)} USDT
                        </td>
                        <td className="py-3.5 text-slate-400">{tier.note}</td>
                        <td className="py-3.5 text-right font-bold">
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                              CURRENT
                            </span>
                          ) : isCompleted ? (
                            <span className="text-slate-500 text-[10px]">COMPLETED</span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">UPCOMING</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: LEADERBOARD (EXACT JAGER.LIVE SECTION)                         */}
      {/* ==================================================================== */}
      {activeTab === "LEADERBOARD" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-slate-800 bg-slate-950/90 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Syndicate Leaderboard
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Live operative rankings on BNB Smart Chain Mainnet
                </p>
              </div>

              {/* Sub-Filters: Invites | Mints | Holders | Ambassadors */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {(["INVITES", "MINTS", "HOLDERS", "AMBASSADORS"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLbCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      lbCategory === cat
                        ? "bg-cyan-400 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 w-16">Rank</th>
                    <th className="pb-3">Tactical Wallet</th>
                    <th className="pb-3 text-center">Metric</th>
                    <th className="pb-3 text-right">Syndicate Distinction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[
                    { rank: 1, wallet: "0x71c8...4f89", metric: "42 Invites · 118 Shares", title: "👑 High Commander" },
                    { rank: 2, wallet: "0x34a2...99e7", metric: "33 Invites · 89 Shares", title: "Division Architect" },
                    { rank: 3, wallet: "0x89d2...4f32", metric: "27 Invites · 74 Shares", title: "Field Marshall" },
                    { rank: 4, wallet: "0x53d8...c3b8", metric: "18 Invites · 52 Shares", title: "Vanguard Leader" },
                    { rank: 5, wallet: "0x12e4...66aa", metric: "15 Invites · 39 Shares", title: "Tactical Captain" },
                  ].map((row) => (
                    <tr key={row.rank} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 font-bold">
                        {row.rank === 1 ? (
                          <span className="flex items-center text-amber-300 gap-1">
                            <Crown className="w-3.5 h-3.5" /> #1
                          </span>
                        ) : (
                          <span className="text-slate-400">#{row.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 text-white font-bold">{row.wallet}</td>
                      <td className="py-3.5 text-center text-emerald-400 font-bold">{row.metric}</td>
                      <td className="py-3.5 text-right text-slate-300">{row.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. LIVE EVENT STREAM (BSC MAINNET)                                   */}
      {/* ==================================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-slate-800 bg-slate-950/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider">
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
                className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
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

      {/* ==================================================================== */}
      {/* 7. OWNER ADMIN PANEL (CONDITIONAL)                                   */}
      {/* ==================================================================== */}
      {isOwner && (
        <div className="p-6 sm:p-8 rounded-[32px] border border-amber-500/40 bg-slate-950/95 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Settings className="w-5 h-5" />
              <span>CONTRACT OWNER ADMIN PANEL</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-white font-bold block">1. Launch PancakeSwap LP</span>
              <p className="text-[11px] text-slate-400">Initial LP Lock Days:</p>
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

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-white font-bold block">2. Claim Vested Team Tokens</span>
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
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. JAGER.LIVE FOOTER DISCLAIMER & CONTRACT VERIFICATION               */}
      {/* ==================================================================== */}
      <footer className="p-6 sm:p-8 rounded-[32px] border border-slate-800/80 bg-slate-950/80 space-y-4 text-[11px] text-slate-400 leading-relaxed">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider">
          $LEGENDS Mint & Share Protocol on BNB Smart Chain
        </h3>
        <p>
          This site mints <strong className="text-white">$LEGENDS</strong> shares and recruits Agent Legends NFTs. Pay only to the verified mint contract <code className="text-sky-300">0x0E918a36bEcAF6dF057bf206C5642D50045BBF35</code>. The token contract <code className="text-slate-300">0x66E0964A2b7a52C2d68A3a19f4d981B0e5381120</code> is for adding $LEGENDS to your wallet; never send BNB or USDT to the token contract.
        </p>
        <p>
          Never transfer USDT directly to the mint contract; approve USDT and call <code className="text-slate-300">buyShares(quantity, referrer, maxUSDTIn)</code>. Agent IDs are verified on BNB Smart Chain Mainnet (Chain ID: 56). Crypto assets are volatile; assess the risks yourself. Nothing on this page is financial advice.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2 text-slate-400">
          <span>Verified Contracts:</span>
          <a
            href={`https://bscscan.com/address/${config.shareMint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            ShareMint ({config.shareMint.slice(0, 8)}...)
          </a>
          <span>·</span>
          <a
            href={`https://bscscan.com/address/${config.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline"
          >
            $LEGENDS Token ({config.token.slice(0, 8)}...)
          </a>
          <span>·</span>
          <a
            href={`https://bscscan.com/address/${config.nft}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Agent NFT ({config.nft.slice(0, 8)}...)
          </a>
        </div>
      </footer>
    </div>
  );
}
