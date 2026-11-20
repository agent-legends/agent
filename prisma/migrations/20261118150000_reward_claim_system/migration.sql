ALTER TABLE "Spin" ADD COLUMN "nftTokenId" TEXT;

ALTER TABLE "Payout" ADD COLUMN "claimId" TEXT;
CREATE UNIQUE INDEX "Payout_claimId_key" ON "Payout"("claimId");

CREATE TABLE "RewardConfiguration" (
  "outcome" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "rewardAmountUsdt" DOUBLE PRECISION NOT NULL,
  "preMilestoneBps" INTEGER NOT NULL DEFAULT 0,
  "postMilestoneBps" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardConfiguration_pkey" PRIMARY KEY ("outcome")
);

CREATE TABLE "RewardMilestone" (
  "id" TEXT NOT NULL DEFAULT 'REWARD_MILESTONE',
  "milestoneReached" BOOLEAN NOT NULL DEFAULT false,
  "verifiedMintCount" INTEGER NOT NULL DEFAULT 0,
  "reachedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardClaim" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "spinId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "nftTokenId" TEXT,
  "outcome" TEXT NOT NULL,
  "rewardAmountUsdt" DOUBLE PRECISION,
  "twitterUrl" TEXT NOT NULL,
  "publicConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "additionalInfo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "isBonus" BOOLEAN NOT NULL DEFAULT false,
  "selectedAt" TIMESTAMP(3),
  "selectedBatchId" TEXT,
  "adminNote" TEXT,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RewardClaim_claimId_key" ON "RewardClaim"("claimId");
CREATE UNIQUE INDEX "RewardClaim_spinId_key" ON "RewardClaim"("spinId");
CREATE INDEX "RewardClaim_walletAddress_idx" ON "RewardClaim"("walletAddress");
CREATE INDEX "RewardClaim_status_idx" ON "RewardClaim"("status");
CREATE INDEX "RewardClaim_isBonus_idx" ON "RewardClaim"("isBonus");
CREATE INDEX "RewardClaim_createdAt_idx" ON "RewardClaim"("createdAt");

ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_spinId_fkey"
  FOREIGN KEY ("spinId") REFERENCES "Spin"("spinId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RewardReview" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "adminWallet" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RewardReview_claimId_idx" ON "RewardReview"("claimId");
CREATE INDEX "RewardReview_createdAt_idx" ON "RewardReview"("createdAt");
ALTER TABLE "RewardReview" ADD CONSTRAINT "RewardReview_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "RewardClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BonusPool" (
  "id" TEXT NOT NULL DEFAULT 'BONUS_POOL',
  "budgetUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "remainingUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "minimumAmountUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "maximumAmountUsdt" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "maximumSelections" INTEGER NOT NULL DEFAULT 10,
  "selectionFrequency" TEXT NOT NULL DEFAULT 'MANUAL',
  "selectionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusPool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BonusSelectionBatch" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "selectedCount" INTEGER NOT NULL DEFAULT 0,
  "unselectedCount" INTEGER NOT NULL DEFAULT 0,
  "allocatedUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "remainingPoolUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusSelectionBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BonusSelectionBatch_batchId_key" ON "BonusSelectionBatch"("batchId");

CREATE TABLE "BonusSelectionEntry" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "selected" BOOLEAN NOT NULL DEFAULT false,
  "rewardAmountUsdt" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusSelectionEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BonusSelectionEntry_claimId_key" ON "BonusSelectionEntry"("claimId");
CREATE UNIQUE INDEX "BonusSelectionEntry_batchId_claimId_key" ON "BonusSelectionEntry"("batchId", "claimId");
CREATE INDEX "BonusSelectionEntry_walletAddress_idx" ON "BonusSelectionEntry"("walletAddress");
CREATE INDEX "BonusSelectionEntry_selected_idx" ON "BonusSelectionEntry"("selected");
ALTER TABLE "BonusSelectionEntry" ADD CONSTRAINT "BonusSelectionEntry_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "BonusSelectionBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BonusSelectionEntry" ADD CONSTRAINT "BonusSelectionEntry_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "RewardClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BonusSelectionEntry" ADD CONSTRAINT "BonusSelectionEntry_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_selectedBatchId_fkey"
  FOREIGN KEY ("selectedBatchId") REFERENCES "BonusSelectionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "RewardClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
