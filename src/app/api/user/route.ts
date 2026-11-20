import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { getContractConfig } from "@/config/contracts";
import { NFT_ABI } from "@/config/abis/nft";
import { getOrCreateUser, prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  }

  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) {
    return NextResponse.json({ error: "NFT contract is not configured for this chain." }, { status: 503 });
  }
  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const [user, nftBalance, isAgent, hasClaimed, totalMinted, remainingAllowance] = await Promise.all([
      getOrCreateUser(wallet),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }).catch(() => 0n),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "isAgenticWalletUser",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }).catch(() => false),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "hasClaimedFree",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }).catch(() => false),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "totalMintedByWallet",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }).catch(() => 0n),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "remainingWalletAllowance",
        args: [wallet as `0x${string}`],
        authorizationList: undefined,
      }).catch(() => 10n),
    ]);

    return NextResponse.json({
      walletAddress: wallet,
      balance: Number(nftBalance),
      isAgenticWalletUser: Boolean(isAgent),
      hasClaimedFree: Boolean(hasClaimed),
      totalMintedByWallet: Number(totalMinted),
      remainingWalletAllowance: Number(remainingAllowance),
      referralCount: user?.successfulReferrals ?? 0,
      referredNftCount: user?.referredNftCount ?? 0,
    });
  } catch (error: unknown) {
    console.error("User profile query failed:", error);
    return NextResponse.json(
      { error: "User profile data could not be loaded from the network." },
      { status: 500 }
    );
  }
}
