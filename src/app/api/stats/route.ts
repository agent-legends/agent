import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { NFT_ABI } from "@/config/abis/nft";
import {
  getContractConfig,
  MAX_SUPPLY,
  MAX_FREE_SUPPLY,
  MAX_PER_WALLET,
  MAX_PAID_PER_WALLET,
  PAID_PRICE_BNB,
} from "@/config/contracts";
import { prisma } from "@/lib/db";

export async function GET() {
  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }

  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) {
    return NextResponse.json(
      { error: "The NFT contract address is not configured for this BNB network." },
      { status: 503 }
    );
  }

  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  let totalMinted = 4;
  let maxSupply = MAX_SUPPLY;
  let freeMintedCount = 4;
  let remainingFree = 996;
  let isPaused = false;

  try {
    const [minted, maximum, freeMinted, freeRem, paused] = await Promise.all([
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "totalSupply",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "MAX_SUPPLY",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "freeMintedCount",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "remainingFreeSupply",
        authorizationList: undefined,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "mintPaused",
        authorizationList: undefined,
      }),
    ]);
    totalMinted = Number(minted);
    maxSupply = Number(maximum);
    freeMintedCount = Number(freeMinted);
    remainingFree = Number(freeRem);
    isPaused = Boolean(paused);
  } catch (onChainError) {
    console.warn("Could not read on-chain supply from RPC:", onChainError);
  }

  let totalUsers = 0;
  try {
    totalUsers = await prisma.user.count().catch(() => 0);
  } catch {
    totalUsers = 0;
  }

  return NextResponse.json({
    totalSupply: maxSupply,
    totalMinted,
    freeMintedCount,
    remainingSupply: Math.max(0, maxSupply - totalMinted),
    remainingFreeSupply: remainingFree,
    paidPriceBnb: Number(PAID_PRICE_BNB),
    maxPaidPerWallet: MAX_PAID_PER_WALLET,
    maxPerWallet: MAX_PER_WALLET,
    mintPaused: isPaused,
    totalUsers,
  });
}
