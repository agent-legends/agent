import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createPublicClient, http, isAddress, parseAbiItem } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { getContractConfig } from "@/config/contracts";
import { prisma } from "@/lib/db";

const CLAIM_EVENT = parseAbiItem(
  "event ReferralNFTClaimed(address indexed account, uint256 indexed tokenId)"
);
const MIN_CONFIRMATIONS = 3n;

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("walletAddress" in body) ||
    !("txHash" in body)
  ) {
    return NextResponse.json({ error: "Wallet address and transaction hash are required." }, { status: 400 });
  }

  const { walletAddress, txHash } = body as { walletAddress: unknown; txHash: unknown };
  if (
    typeof walletAddress !== "string" ||
    !isAddress(walletAddress) ||
    typeof txHash !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(txHash)
  ) {
    return NextResponse.json({ error: "Invalid wallet address or transaction hash." }, { status: 400 });
  }

  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) {
    return NextResponse.json({ error: "NFT contract address is not configured for this chain." }, { status: 503 });
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedHash = txHash.toLowerCase() as `0x${string}`;
  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });

  try {
    const recorded = await prisma.transaction.findUnique({ where: { txHash: normalizedHash } });
    if (recorded) {
      if (recorded.walletAddress !== normalizedWallet || recorded.type !== "CLAIM_REFERRAL_NFT") {
        return NextResponse.json({ error: "Transaction hash is already associated with another record." }, { status: 409 });
      }
      return NextResponse.json({ success: true, alreadyRecorded: true });
    }

    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: normalizedHash }),
      client.getTransactionReceipt({ hash: normalizedHash }),
    ]);
    if (transaction.from.toLowerCase() !== normalizedWallet) {
      return NextResponse.json({ error: "Transaction sender does not match the wallet." }, { status: 403 });
    }
    if (transaction.to?.toLowerCase() !== config.nft.toLowerCase()) {
      return NextResponse.json({ error: "Transaction did not call the configured NFT contract." }, { status: 422 });
    }
    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Referral NFT claim reverted." }, { status: 422 });
    }
    if ((await client.getBlockNumber()) - receipt.blockNumber + 1n < MIN_CONFIRMATIONS) {
      return NextResponse.json({ error: "Claim transaction is awaiting required confirmations." }, { status: 409 });
    }

    const claimLogs = await client.getLogs({
      address: config.nft as `0x${string}`,
      event: CLAIM_EVENT,
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    const claims = claimLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.account.toLowerCase() === normalizedWallet
    );
    if (claims.length !== 1) {
      return NextResponse.json({ error: "A unique referral NFT claim event was not found." }, { status: 422 });
    }

    const tokenId = claims[0].args.tokenId.toString();
    await prisma.$transaction(
      async (tx) => {
        await tx.user.upsert({
          where: { walletAddress: normalizedWallet },
          create: {
            walletAddress: normalizedWallet,
            totalMints: 1,
            claimedFreeNfts: 1,
          },
          update: {
            totalMints: { increment: 1 },
            claimedFreeNfts: { increment: 1 },
          },
        });
        await tx.transaction.create({
          data: {
            txHash: normalizedHash,
            walletAddress: normalizedWallet,
            type: "CLAIM_REFERRAL_NFT",
            amount: "1",
            metadata: JSON.stringify({ quantity: "1", tokenId }),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ success: true, quantity: "1", tokenId });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.transaction.findUnique({ where: { txHash: normalizedHash } });
      if (existing?.walletAddress === normalizedWallet && existing.type === "CLAIM_REFERRAL_NFT") {
        return NextResponse.json({ success: true, alreadyRecorded: true });
      }
      return NextResponse.json({ error: "Transaction was already recorded." }, { status: 409 });
    }
    console.error("Referral NFT claim synchronization failed:", error);
    return NextResponse.json({ error: "Referral NFT claim could not be synchronized." }, { status: 503 });
  }
}
