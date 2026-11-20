-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL,
    "referrerAddress" TEXT,
    "totalMints" INTEGER NOT NULL DEFAULT 0,
    "totalStaked" INTEGER NOT NULL DEFAULT 0,
    "availableSpins" INTEGER NOT NULL DEFAULT 0,
    "totalSpins" INTEGER NOT NULL DEFAULT 0,
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "referredNftCount" INTEGER NOT NULL DEFAULT 0,
    "claimedFreeNfts" INTEGER NOT NULL DEFAULT 0,
    "totalRewardsWonUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pendingPayoutUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paidPayoutUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "Spin" (
    "id" TEXT NOT NULL,
    "spinId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "rewardAmountUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isFreeSpinAwarded" BOOLEAN NOT NULL DEFAULT false,
    "randomNumber" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "payoutStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "spinId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "rewardAmountUsdt" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_referrerAddress_idx" ON "User"("referrerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Spin_spinId_key" ON "Spin"("spinId");

-- CreateIndex
CREATE UNIQUE INDEX "Spin_requestId_key" ON "Spin"("requestId");

-- CreateIndex
CREATE INDEX "Spin_walletAddress_idx" ON "Spin"("walletAddress");

-- CreateIndex
CREATE INDEX "Spin_payoutStatus_idx" ON "Spin"("payoutStatus");

-- CreateIndex
CREATE INDEX "Spin_createdAt_idx" ON "Spin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_spinId_key" ON "Payout"("spinId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_txHash_key" ON "Payout"("txHash");

-- CreateIndex
CREATE INDEX "Payout_walletAddress_idx" ON "Payout"("walletAddress");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_txHash_idx" ON "Payout"("txHash");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminWallet_idx" ON "AdminAuditLog"("adminWallet");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_walletAddress_idx" ON "Transaction"("walletAddress");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- AddForeignKey
ALTER TABLE "Spin" ADD CONSTRAINT "Spin_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_spinId_fkey" FOREIGN KEY ("spinId") REFERENCES "Spin"("spinId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
