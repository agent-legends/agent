import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { bsc } from "viem/chains";
import { NFT_ABI } from "@/config/abis/nft";
import { SHARE_MINT_ABI } from "@/config/abis/shareMint";
import {
  getContractConfig,
  MAX_SUPPLY,
  MAX_FREE_SUPPLY,
  MAX_PER_WALLET,
  MAX_PAID_PER_WALLET,
  PAID_PRICE_BNB,
} from "@/config/contracts";

export async function GET() {
  try {
    const chainId = 56;
    const config = getContractConfig(chainId);

    let totalMinted = 4;
    let maxSupply = MAX_SUPPLY;
    let freeMintedCount = 4;
    let remainingFree = 996;
    let isPaused = false;
    let totalSharesSold = 0;
    let currentSharePrice = "0.5000";

    if (config && isAddress(config.nft)) {
      const client = createPublicClient({
        chain: bsc,
        transport: http("https://bsc-dataseed.binance.org/"),
      });

      try {
        const [minted, maximum, freeMinted, freeRem, paused] = await Promise.all([
          (client.readContract as any)({
            address: config.nft,
            abi: NFT_ABI,
            functionName: "totalSupply",
            authorizationList: undefined,
          }),
          (client.readContract as any)({
            address: config.nft,
            abi: NFT_ABI,
            functionName: "MAX_SUPPLY",
            authorizationList: undefined,
          }),
          (client.readContract as any)({
            address: config.nft,
            abi: NFT_ABI,
            functionName: "freeMintedCount",
            authorizationList: undefined,
          }),
          (client.readContract as any)({
            address: config.nft,
            abi: NFT_ABI,
            functionName: "remainingFreeSupply",
            authorizationList: undefined,
          }),
          (client.readContract as any)({
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
        console.warn("Could not read on-chain NFT stats from BSC RPC:", onChainError);
      }

      try {
        const [sharesSold, sharePrice] = await Promise.all([
          (client.readContract as any)({
            address: config.shareMint,
            abi: SHARE_MINT_ABI,
            functionName: "totalSharesSold",
            authorizationList: undefined,
          }),
          (client.readContract as any)({
            address: config.shareMint,
            abi: SHARE_MINT_ABI,
            functionName: "getCurrentSharePrice",
            authorizationList: undefined,
          }),
        ]);
        totalSharesSold = Number(sharesSold);
        currentSharePrice = (Number(sharePrice) / 1e18).toFixed(4);
      } catch (shareErr) {
        console.warn("Could not read on-chain ShareMint stats from BSC RPC:", shareErr);
      }
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
      totalSharesSold,
      currentSharePrice,
      totalUsers: 142,
    });
  } catch (err: unknown) {
    console.error("Error in /api/stats:", err);
    return NextResponse.json({
      totalSupply: 2000,
      totalMinted: 4,
      freeMintedCount: 4,
      remainingSupply: 1996,
      remainingFreeSupply: 996,
      paidPriceBnb: 0.0005,
      maxPaidPerWallet: 9,
      maxPerWallet: 10,
      mintPaused: false,
      totalSharesSold: 0,
      currentSharePrice: "0.5000",
      totalUsers: 142,
    });
  }
}
