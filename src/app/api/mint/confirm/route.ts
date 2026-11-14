import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  createPublicClient,
  http,
  isAddress,
  parseAbiItem,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { prisma } from "@/lib/db";

const MINT_EVENT = parseAbiItem(
  "event AgentMinted(address indexed minter, uint256 indexed startTokenId, uint256 quantity, uint256 bnbCost, address indexed referrer)"
);
const REFERRAL_EVENT = parseAbiItem(
  "event ReferralAttributed(address indexed referee, address indexed referrer)"
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

  const chainId = Number(process.env.BSC_CHAIN_ID || "97");
  if (chainId !== 56 && chainId !== 97) {
    return NextResponse.json({ error: "BSC_CHAIN_ID must be 56 or 97." }, { status: 503 });
  }
  const config = CONTRACT_ADDRESSES[chainId];
  if (!isAddress(config.nft)) {
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

    const [mintLogs, referralLogs] = await Promise.all([
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
    ]);
    const matchingMintLogs = mintLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.minter.toLowerCase() === normalizedWallet
    );
    if (matchingMintLogs.length !== 1) {
      return NextResponse.json({ error: "A unique Agent Legends mint event was not found." }, { status: 422 });
    }

    const mintArgs = matchingMintLogs[0].args;
    const mintRecord = {
      startTokenId: mintArgs.startTokenId,
      quantity: mintArgs.quantity,
      referrer: mintArgs.referrer.toLowerCase(),
    };
    const matchingReferralLogs = referralLogs.filter(
      (log) =>
        log.transactionHash.toLowerCase() === normalizedHash &&
        log.args.referee.toLowerCase() === normalizedWallet
    );
    if (matchingReferralLogs.length > 1) {
      return NextResponse.json({ error: "Mint transaction contains ambiguous referral events." }, { status: 422 });
    }
    const attributedReferrer = matchingReferralLogs[0]?.args.referrer.toLowerCase();

    if (!mintRecord || mintRecord.quantity < 1n || mintRecord.quantity > 20n) {
      return NextResponse.json({ error: "A valid Agent Legends mint event was not found." }, { status: 422 });
    }
    if (attributedReferrer && attributedReferrer !== mintRecord.referrer) {
      return NextResponse.json({ error: "Mint referral events do not match." }, { status: 422 });
    }

    const quantity = Number(mintRecord.quantity);
    await prisma.$transaction(
      async (tx) => {
        await tx.user.upsert({
          where: { walletAddress: normalizedWallet },
          create: {
            walletAddress: normalizedWallet,
            totalMints: quantity,
            referrerAddress: attributedReferrer || null,
          },
          update: {
            totalMints: { increment: quantity },
            ...(attributedReferrer ? { referrerAddress: attributedReferrer } : {}),
          },
        });
        await tx.transaction.create({
          data: {
            txHash: normalizedHash,
            walletAddress: normalizedWallet,
            type: "MINT",
            amount: quantity.toString(),
            metadata: JSON.stringify({
              startTokenId: mintRecord.startTokenId.toString(),
              quantity,
              referrer: mintRecord.referrer,
            }),
          },
        });

        if (mintRecord.referrer !== ZERO_ADDRESS) {
          await tx.user.upsert({
            where: { walletAddress: mintRecord.referrer },
            create: {
              walletAddress: mintRecord.referrer,
              successfulReferrals: attributedReferrer ? 1 : 0,
              referredNftCount: quantity,
            },
            update: {
              referredNftCount: { increment: quantity },
              ...(attributedReferrer ? { successfulReferrals: { increment: 1 } } : {}),
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      success: true,
      quantity,
      startTokenId: mintRecord.startTokenId.toString(),
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
