import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createPublicClient, http, isAddress, parseAbiItem } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { getContractConfig } from "@/config/contracts";
import { NFT_ABI } from "@/config/abis/nft";
import { prisma } from "@/lib/db";

const MINT_EVENT = parseAbiItem(
  "event NFTMinted(address indexed recipient, uint256 indexed tokenId, uint256 platformFee)"
);
const REFERRAL_EVENT = parseAbiItem(
  "event ReferralRecorded(address indexed referrer, address indexed referee, uint256 totalReferrals)"
);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
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
      if (recorded.walletAddress !== normalizedWallet || recorded.type !== "MINT") {
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
      return NextResponse.json({ error: "Mint transaction reverted." }, { status: 422 });
    }
    if ((await client.getBlockNumber()) - receipt.blockNumber + 1n < MIN_CONFIRMATIONS) {
      return NextResponse.json({ error: "Mint transaction is awaiting required confirmations." }, { status: 409 });
    }

    const [mintLogs, referralLogs, assignedReferrer] = await Promise.all([
      client.getLogs({
        address: config.nft as `0x${string}`,
        event: MINT_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      }),
      client.getLogs({
        address: config.nft as `0x${string}`,
        event: REFERRAL_EVENT,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      }),
      client.readContract({
        address: config.nft,
        abi: NFT_ABI,
        functionName: "referrerOf",
        args: [normalizedWallet as `0x${string}`],
      }),
    ]);
    const mintEvents = mintLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.recipient.toLowerCase() === normalizedWallet
    );
    const referralEvents = referralLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.referee.toLowerCase() === normalizedWallet
    );
    if (mintEvents.length === 0 || mintEvents.length > 20 || referralEvents.length > 1) {
      return NextResponse.json({ error: "Valid mint events were not found for this wallet." }, { status: 422 });
    }
    const referralEvent = referralEvents[0];
    if (
      referralEvent &&
      (assignedReferrer.toLowerCase() !== referralEvent.args.referrer.toLowerCase() ||
        assignedReferrer.toLowerCase() === ZERO_ADDRESS)
    ) {
      return NextResponse.json({ error: "On-chain referral attribution does not match the mint event." }, { status: 422 });
    }

    const tokenIds = mintEvents.map((log) => log.args.tokenId.toString());
    const quantity = tokenIds.length;
    const referrerAddress =
      assignedReferrer.toLowerCase() === ZERO_ADDRESS ? null : assignedReferrer.toLowerCase();
    const metadata = JSON.stringify({ quantity, tokenIds, referrerAddress });

    await prisma.$transaction(
      async (tx) => {
        await tx.user.upsert({
          where: { walletAddress: normalizedWallet },
          create: {
            walletAddress: normalizedWallet,
            totalMints: quantity,
            referrerAddress,
          },
          update: {
            totalMints: { increment: quantity },
            ...(referrerAddress ? { referrerAddress } : {}),
          },
        });
        await tx.transaction.create({
          data: {
            txHash: normalizedHash,
            walletAddress: normalizedWallet,
            type: "MINT",
            amount: quantity.toString(),
            metadata,
          },
        });

        if (referrerAddress) {
          await tx.user.upsert({
            where: { walletAddress: referrerAddress },
            create: {
              walletAddress: referrerAddress,
              successfulReferrals: referralEvent ? 1 : 0,
              referredNftCount: quantity,
            },
            update: {
              ...(referralEvent ? { successfulReferrals: { increment: 1 } } : {}),
              referredNftCount: { increment: quantity },
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      success: true,
      quantity,
      tokenIds,
      referrerAddress,
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.transaction.findUnique({ where: { txHash: normalizedHash } });
      if (existing?.walletAddress === normalizedWallet && existing.type === "MINT") {
        return NextResponse.json({ success: true, alreadyRecorded: true });
      }
      return NextResponse.json({ error: "Transaction was already recorded." }, { status: 409 });
    }
    console.error("Mint transaction synchronization failed:", error);
    return NextResponse.json({ error: "Mint transaction could not be synchronized." }, { status: 503 });
  }
}
