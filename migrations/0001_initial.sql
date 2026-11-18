-- CreateTable
CREATE TABLE "User" (
    "walletAddress" TEXT NOT NULL PRIMARY KEY,
    "referrerAddress" TEXT,
    "totalMints" INTEGER NOT NULL DEFAULT 0,
    "totalStaked" INTEGER NOT NULL DEFAULT 0,
    "availableSpins" INTEGER NOT NULL DEFAULT 0,
    "totalSpins" INTEGER NOT NULL DEFAULT 0,
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "referredNftCount" INTEGER NOT NULL DEFAULT 0,
    "claimedFreeNfts" INTEGER NOT NULL DEFAULT 0,
    "totalRewardsWonUsdt" REAL NOT NULL DEFAULT 0.0,
    "pendingPayoutUsdt" REAL NOT NULL DEFAULT 0.0,
    "paidPayoutUsdt" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Spin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spinId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "rewardAmountUsdt" REAL NOT NULL DEFAULT 0.0,
    "isFreeSpinAwarded" BOOLEAN NOT NULL DEFAULT false,
    "randomNumber" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "payoutStatus" TEXT NOT NULL DEFAULT 'NONE',
    "nftTokenId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Spin_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonusSelectionBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "unselectedCount" INTEGER NOT NULL DEFAULT 0,
    "allocatedUsdt" REAL NOT NULL DEFAULT 0.0,
    "remainingPoolUsdt" REAL NOT NULL DEFAULT 0.0,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "spinId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "nftTokenId" TEXT,
    "outcome" TEXT NOT NULL,
    "rewardAmountUsdt" REAL,
    "twitterUrl" TEXT NOT NULL,
    "publicConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "isBonus" BOOLEAN NOT NULL DEFAULT false,
    "selectedAt" DATETIME,
    "selectedBatchId" TEXT,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RewardClaim_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RewardClaim_spinId_fkey" FOREIGN KEY ("spinId") REFERENCES "Spin" ("spinId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RewardClaim_selectedBatchId_fkey" FOREIGN KEY ("selectedBatchId") REFERENCES "BonusSelectionBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spinId" TEXT NOT NULL,
    "claimId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "rewardAmountUsdt" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "verifiedAt" DATETIME,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payout_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payout_spinId_fkey" FOREIGN KEY ("spinId") REFERENCES "Spin" ("spinId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payout_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "RewardClaim" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardConfiguration" (
    "outcome" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "rewardAmountUsdt" REAL NOT NULL,
    "preMilestoneBps" INTEGER NOT NULL DEFAULT 0,
    "postMilestoneBps" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'REWARD_MILESTONE',
    "milestoneReached" BOOLEAN NOT NULL DEFAULT false,
    "verifiedMintCount" INTEGER NOT NULL DEFAULT 0,
    "reachedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "adminWallet" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardReview_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "RewardClaim" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonusPool" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'BONUS_POOL',
    "budgetUsdt" REAL NOT NULL DEFAULT 0.0,
    "remainingUsdt" REAL NOT NULL DEFAULT 0.0,
    "minimumAmountUsdt" REAL NOT NULL DEFAULT 0.05,
    "maximumAmountUsdt" REAL NOT NULL DEFAULT 1.0,
    "maximumSelections" INTEGER NOT NULL DEFAULT 10,
    "selectionFrequency" TEXT NOT NULL DEFAULT 'MANUAL',
    "selectionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BonusSelectionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rewardAmountUsdt" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BonusSelectionEntry_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BonusSelectionBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonusSelectionEntry_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "RewardClaim" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonusSelectionEntry_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminWallet" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "User_referrerAddress_idx" ON "User"("referrerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Spin_spinId_key" ON "Spin"("spinId");
CREATE UNIQUE INDEX "Spin_requestId_key" ON "Spin"("requestId");
CREATE INDEX "Spin_walletAddress_idx" ON "Spin"("walletAddress");
CREATE INDEX "Spin_payoutStatus_idx" ON "Spin"("payoutStatus");
CREATE INDEX "Spin_createdAt_idx" ON "Spin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_spinId_key" ON "Payout"("spinId");
CREATE UNIQUE INDEX "Payout_claimId_key" ON "Payout"("claimId");
CREATE UNIQUE INDEX "Payout_txHash_key" ON "Payout"("txHash");
CREATE INDEX "Payout_walletAddress_idx" ON "Payout"("walletAddress");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_txHash_idx" ON "Payout"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_claimId_key" ON "RewardClaim"("claimId");
CREATE UNIQUE INDEX "RewardClaim_spinId_key" ON "RewardClaim"("spinId");
CREATE INDEX "RewardClaim_walletAddress_idx" ON "RewardClaim"("walletAddress");
CREATE INDEX "RewardClaim_status_idx" ON "RewardClaim"("status");
CREATE INDEX "RewardClaim_isBonus_idx" ON "RewardClaim"("isBonus");
CREATE INDEX "RewardClaim_createdAt_idx" ON "RewardClaim"("createdAt");

-- CreateIndex
CREATE INDEX "RewardReview_claimId_idx" ON "RewardReview"("claimId");
CREATE INDEX "RewardReview_createdAt_idx" ON "RewardReview"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BonusSelectionBatch_batchId_key" ON "BonusSelectionBatch"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "BonusSelectionEntry_claimId_key" ON "BonusSelectionEntry"("claimId");
CREATE INDEX "BonusSelectionEntry_walletAddress_idx" ON "BonusSelectionEntry"("walletAddress");
CREATE INDEX "BonusSelectionEntry_selected_idx" ON "BonusSelectionEntry"("selected");
CREATE UNIQUE INDEX "BonusSelectionEntry_batchId_claimId_key" ON "BonusSelectionEntry"("batchId", "claimId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminWallet_idx" ON "AdminAuditLog"("adminWallet");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");
CREATE INDEX "Transaction_walletAddress_idx" ON "Transaction"("walletAddress");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
