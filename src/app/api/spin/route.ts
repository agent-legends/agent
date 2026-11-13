import { NextRequest, NextResponse } from "next/server";
import { executeSecureBackendSpin } from "@/lib/spinEngine";
import { prisma, memoryStore, getOrCreateUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid or missing wallet address" }, { status: 400 });
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const user = await getOrCreateUser(normalizedWallet);

    // Verify user has at least 1 available spin
    // If user is brand new or hasn't staked yet, they can get 1 initial test credit or require stake
    if (user.availableSpins <= 0) {
      // In production, user earns spins from staking. If user has staked NFTs but availableSpins == 0, check.
      return NextResponse.json(
        {
          error: "No spin credits available. Stake an Agent Legends NFT to earn spin credits!",
          availableSpins: 0,
        },
        { status: 400 }
      );
    }

    // Execute cryptographically secure backend spin
    const spinResult = executeSecureBackendSpin(normalizedWallet);

    // Save to Database or MemoryStore
    let updatedAvailableSpins = user.availableSpins - 1;
    if (spinResult.isFreeSpinAwarded) {
      updatedAvailableSpins += 1; // 1 free spin added back
    }

    try {
      // Prisma DB update
      await prisma.$transaction(async (tx) => {
        const spin = await tx.spin.create({
          data: {
            spinId: spinResult.spinId,
            walletAddress: normalizedWallet,
            outcome: spinResult.outcome,
            rewardAmountUsdt: spinResult.rewardAmountUsdt,
            isFreeSpinAwarded: spinResult.isFreeSpinAwarded,
            randomNumber: spinResult.randomNumber,
            randomSeed: spinResult.randomSeed,
            isWinner: spinResult.isWinner,
            payoutStatus: spinResult.requiresPayout ? "PENDING" : "NONE",
          },
        });

        if (spinResult.requiresPayout) {
          await tx.payout.create({
            data: {
              spinId: spin.spinId,
              walletAddress: normalizedWallet,
              rewardAmountUsdt: spinResult.rewardAmountUsdt,
              status: "PENDING",
            },
          });
        }

        await tx.user.update({
          where: { walletAddress: normalizedWallet },
          data: {
            availableSpins: updatedAvailableSpins,
            totalSpins: { increment: 1 },
            totalRewardsWonUsdt: { increment: spinResult.rewardAmountUsdt },
            pendingPayoutUsdt: {
              increment: spinResult.requiresPayout ? spinResult.rewardAmountUsdt : 0,
            },
          },
        });
      });
    } catch {
      // Memory Store fallback
      user.availableSpins = updatedAvailableSpins;
      user.totalSpins = (user.totalSpins || 0) + 1;
      user.totalRewardsWonUsdt = (user.totalRewardsWonUsdt || 0) + spinResult.rewardAmountUsdt;
      if (spinResult.requiresPayout) {
        user.pendingPayoutUsdt = (user.pendingPayoutUsdt || 0) + spinResult.rewardAmountUsdt;
        memoryStore.payouts.unshift({
          id: `pay_${Date.now()}`,
          spinId: spinResult.spinId,
          walletAddress: normalizedWallet,
          rewardAmountUsdt: spinResult.rewardAmountUsdt,
          status: "PENDING",
          txHash: null,
          verifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      memoryStore.spins.unshift({
        ...spinResult,
        payoutStatus: spinResult.requiresPayout ? "PENDING" : "NONE",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      spin: spinResult,
      remainingSpins: updatedAvailableSpins,
      notice:
        "Centralized Randomness Disclosure: This platform uses a cryptographically secure backend pseudo-random number generator (CSPRNG). Results are determined on the backend and are not independently verifiable Chainlink VRF results.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Spin execution error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

