import { createPublicClient, http, isAddress } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { NFT_ABI } from "@/config/abis/nft";
import { getContractConfig } from "@/config/contracts";
import { prisma } from "@/lib/db";
import { DEFAULT_REWARD_CONFIG } from "@/lib/spinEngine";

export interface RewardMilestoneStatus {
  chainId: number;
  mintedCount: number;
  milestoneReached: boolean;
  remainingToMilestone: number;
}

export async function getVerifiedRewardMilestone(): Promise<RewardMilestoneStatus> {
  const chainId = Number(process.env.BSC_CHAIN_ID || "56");
  if (chainId !== 56 && chainId !== 97) throw new Error("BSC_CHAIN_ID must be 56 or 97.");

  const config = getContractConfig(chainId);
  if (!config || !isAddress(config.nft)) throw new Error("NFT contract is not configured.");

  const client = createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(config.rpcUrl),
  });
  const minted = await client.readContract({
    address: config.nft,
    abi: NFT_ABI,
    functionName: "totalMinted",
    authorizationList: undefined,
  });
  const mintedCount = Number(minted);
  const milestoneReached = mintedCount >= 1000;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.rewardMilestone.findUnique({
      where: { id: "REWARD_MILESTONE" },
    });
    if (!existing?.milestoneReached && milestoneReached) {
      await tx.rewardMilestone.update({
        where: { id: "REWARD_MILESTONE" },
        data: {
          milestoneReached: true,
          verifiedMintCount: mintedCount,
          reachedAt: new Date(),
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminWallet: "SYSTEM",
          action: "MILESTONE_UNLOCKED",
          targetId: "REWARD_MILESTONE",
          details: JSON.stringify({ mintedCount, unlockedAt: new Date().toISOString(), source: "ON_CHAIN_TOTAL_MINTED" }),
        },
      });
    } else if (existing) {
      await tx.rewardMilestone.update({
        where: { id: "REWARD_MILESTONE" },
        data: { verifiedMintCount: mintedCount },
      });
    } else {
      await tx.rewardMilestone.create({
        data: {
          milestoneReached,
          verifiedMintCount: mintedCount,
          reachedAt: milestoneReached ? new Date() : null,
        },
      });
    }
  });

  return {
    chainId,
    mintedCount,
    milestoneReached,
    remainingToMilestone: Math.max(0, 1000 - mintedCount),
  };
}

export async function getRewardTiers() {
  const stored = await prisma.rewardConfiguration.findMany();
  if (stored.length === 0) {
    await prisma.$transaction(
      DEFAULT_REWARD_CONFIG.map((tier) =>
        prisma.rewardConfiguration.create({
          data: {
            outcome: tier.outcome,
            label: tier.label,
            rewardAmountUsdt: tier.rewardAmountUsdt,
            preMilestoneBps: tier.preMilestoneBps,
            postMilestoneBps: tier.postMilestoneBps,
          },
        })
      )
    );
    return prisma.rewardConfiguration.findMany();
  }
  return stored;
}
