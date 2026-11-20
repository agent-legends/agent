import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { AgentLegendsNFT, AgentLegendsStaking, MockPriceFeed } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Agent Legends 2.0 — Smart Contracts Test Suite", function () {
  let nft: AgentLegendsNFT;
  let staking: AgentLegendsStaking;
  let mockPriceFeed: MockPriceFeed;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let user4: SignerWithAddress;
  let referrer: SignerWithAddress;

  // $600 per BNB with 8 decimals = 600 * 10^8 = 60,000,000,000
  const INITIAL_BNB_PRICE = 60000000000n; // $600

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, referrer] = await ethers.getSigners();

    // 1. Deploy Mock Chainlink BNB/USD Aggregator
    const MockPriceFeedFactory = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = (await MockPriceFeedFactory.deploy(8, INITIAL_BNB_PRICE)) as unknown as MockPriceFeed;
    await mockPriceFeed.waitForDeployment();

    // 2. Deploy AgentLegendsNFT
    const NFTFactory = await ethers.getContractFactory("AgentLegendsNFT");
    nft = (await NFTFactory.deploy(
      owner.address,
      await mockPriceFeed.getAddress(),
      "ipfs://bafybeiccyberpunkmetadata/"
    )) as unknown as AgentLegendsNFT;
    await nft.waitForDeployment();

    // 3. Deploy AgentLegendsStaking
    const StakingFactory = await ethers.getContractFactory("AgentLegendsStaking");
    staking = (await StakingFactory.deploy(
      owner.address,
      await nft.getAddress()
    )) as unknown as AgentLegendsStaking;
    await staking.waitForDeployment();
  });

  describe("1. Chainlink Oracle Pricing & NFT Minting", function () {
    it("Should compute correct BNB price for $0.20 USD using oracle", async function () {
      // At $600/BNB, $0.20 USD = 0.20 / 600 = 0.000333333333333333 BNB = 333333333333333 wei
      const priceWei = await nft.getMintPriceInWei();
      expect(priceWei).to.be.gt(0n);
      // Check mathematical precision: (0.20 * 1e8 * 1e18) / (600 * 1e8) = 1e18 / 3000 = 333333333333333 wei
      expect(priceWei).to.equal(333333333333333n);
    });

    it("Should dynamically adjust mint cost if BNB price fluctuates", async function () {
      // Change BNB price to $300 (halved price means doubled BNB cost)
      await mockPriceFeed.setPrice(30000000000n);
      const newPriceWei = await nft.getMintPriceInWei();
      expect(newPriceWei).to.equal(666666666666666n);
    });

    it("Should allow user to mint single and multiple NFTs with BNB", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      const mintCount = 5n;
      const totalCost = unitPrice * mintCount;

      await expect(
        nft.connect(user1).mint(mintCount, ethers.ZeroAddress, { value: totalCost })
      )
        .to.emit(nft, "AgentMinted")
        .withArgs(user1.address, 1n, mintCount, totalCost, ethers.ZeroAddress);

      expect(await nft.balanceOf(user1.address)).to.equal(5n);
      expect(await nft.totalSupply()).to.equal(5n);
      expect(await nft.ownerOf(1)).to.equal(user1.address);
      expect(await nft.ownerOf(5)).to.equal(user1.address);
    });

    it("Should refund excess BNB sent", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      const sentAmount = unitPrice * 2n; // Sending 2x the required cost for 1 NFT

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await nft.connect(user1).mint(1n, ethers.ZeroAddress, { value: sentAmount });
      const receipt = await tx.wait();
      const gasSpent = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      // Balance difference should only be unitPrice + gasSpent
      expect(initialBalance - finalBalance).to.be.closeTo(unitPrice + gasSpent, ethers.parseEther("0.00001"));
    });

    it("Should revert if insufficient BNB is sent", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      await expect(
        nft.connect(user1).mint(2n, ethers.ZeroAddress, { value: unitPrice })
      ).to.be.revertedWithCustomError(nft, "InsufficientBnbPayment");
    });

    it("Should revert if mint quantity is zero or exceeds 20", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      await expect(
        nft.connect(user1).mint(0n, ethers.ZeroAddress, { value: unitPrice })
      ).to.be.revertedWithCustomError(nft, "InvalidMintQuantity");

      await expect(
        nft.connect(user1).mint(21n, ethers.ZeroAddress, { value: unitPrice * 21n })
      ).to.be.revertedWithCustomError(nft, "InvalidMintQuantity");
    });
  });

  describe("2. Referral System & Free NFT Milestones", function () {
    it("Should prevent self-referral", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      await nft.connect(user1).mint(1n, user1.address, { value: unitPrice });

      expect(await nft.userReferrer(user1.address)).to.equal(ethers.ZeroAddress);
      expect(await nft.referralCount(user1.address)).to.equal(0n);
    });

    it("Should permanently bind referrer on first successful mint and track NFT count", async function () {
      const unitPrice = await nft.getMintPriceInWei();

      // user1 mints 3 NFTs with referrer
      await nft.connect(user1).mint(3n, referrer.address, { value: unitPrice * 3n });

      expect(await nft.userReferrer(user1.address)).to.equal(referrer.address);
      expect(await nft.referralCount(referrer.address)).to.equal(1n);
      expect(await nft.referralNftCount(referrer.address)).to.equal(3n);

      // user1 mints 2 more NFTs without referrer param -> attribution stays with referrer
      await nft.connect(user1).mint(2n, ethers.ZeroAddress, { value: unitPrice * 2n });
      // Referral count (unique wallets) remains 1, but NFT count increases to 5
      expect(await nft.referralCount(referrer.address)).to.equal(1n);
      expect(await nft.referralNftCount(referrer.address)).to.equal(5n);
    });

    it("Should unlock 1 free NFT for every 3 successful referred wallets (cumulative)", async function () {
      const unitPrice = await nft.getMintPriceInWei();

      // Wallet 1 mints
      await nft.connect(user1).mint(1n, referrer.address, { value: unitPrice });
      expect(await nft.referralCount(referrer.address)).to.equal(1n);
      expect(await nft.unclaimedReferralRewards(referrer.address)).to.equal(0n);

      // Wallet 2 mints
      await nft.connect(user2).mint(1n, referrer.address, { value: unitPrice });
      expect(await nft.referralCount(referrer.address)).to.equal(2n);
      expect(await nft.unclaimedReferralRewards(referrer.address)).to.equal(0n);

      // Wallet 3 mints -> 3 referrals reached! 1 free NFT unlocked!
      await nft.connect(user3).mint(1n, referrer.address, { value: unitPrice });
      expect(await nft.referralCount(referrer.address)).to.equal(3n);
      expect(await nft.totalReferralRewardsEarned(referrer.address)).to.equal(1n);
      expect(await nft.unclaimedReferralRewards(referrer.address)).to.equal(1n);

      // Referrer claims their free NFT
      await expect(nft.connect(referrer).claimReferralRewards(1n))
        .to.emit(nft, "ReferralRewardClaimed")
        .withArgs(referrer.address, 1n, 4n);

      expect(await nft.balanceOf(referrer.address)).to.equal(1n);
      expect(await nft.unclaimedReferralRewards(referrer.address)).to.equal(0n);
      expect(await nft.referralRewardsClaimed(referrer.address)).to.equal(1n);

      // Wallet 4 mints
      await nft.connect(user4).mint(1n, referrer.address, { value: unitPrice });
      expect(await nft.referralCount(referrer.address)).to.equal(4n);
      expect(await nft.unclaimedReferralRewards(referrer.address)).to.equal(0n);
    });
  });

  describe("3. NFT Staking & 72-Hour Lock & Initial Spin Rule", function () {
    beforeEach(async function () {
      const unitPrice = await nft.getMintPriceInWei();
      // user1 mints token #1 and #2
      await nft.connect(user1).mint(2n, ethers.ZeroAddress, { value: unitPrice * 2n });
      // Approve staking contract
      await nft.connect(user1).setApprovalForAll(await staking.getAddress(), true);
    });

    it("Should stake NFTs safely and grant exactly one initial spin credit per NFT", async function () {
      await expect(staking.connect(user1).stake([1n, 2n]))
        .to.emit(staking, "NftStaked")
        .and.to.emit(staking, "InitialSpinGenerated");

      expect(await staking.totalStakedCount()).to.equal(2n);
      expect(await staking.initialSpinsAwarded(user1.address)).to.equal(2n);
      expect(await staking.hasGeneratedInitialSpin(1n)).to.equal(true);
      expect(await staking.hasGeneratedInitialSpin(2n)).to.equal(true);

      const stakedList = await staking.getUserStakedTokens(user1.address);
      expect(stakedList.length).to.equal(2);
      expect(stakedList[0]).to.equal(1n);
      expect(stakedList[1]).to.equal(2n);
    });

    it("Should prevent unstaking before 72 hours", async function () {
      await staking.connect(user1).stake([1n]);

      // Attempt to unstake immediately -> should revert
      await expect(
        staking.connect(user1).unstake([1n])
      ).to.be.revertedWithCustomError(staking, "StakingLocked");

      // Advance time by 71 hours (still locked)
      await time.increase(71 * 3600);
      await expect(
        staking.connect(user1).unstake([1n])
      ).to.be.revertedWithCustomError(staking, "StakingLocked");
    });

    it("Should permit unstaking after 72 hours have elapsed", async function () {
      await staking.connect(user1).stake([1n]);

      // Advance time past 72 hours
      await time.increase(72 * 3600 + 1);

      await expect(staking.connect(user1).unstake([1n]))
        .to.emit(staking, "NftUnstaked");

      expect(await staking.totalStakedCount()).to.equal(0n);
      expect(await nft.ownerOf(1n)).to.equal(user1.address);
    });

    it("Restaking an NFT does NOT generate another initial spin credit", async function () {
      await staking.connect(user1).stake([1n]);
      expect(await staking.initialSpinsAwarded(user1.address)).to.equal(1n);

      // Advance time past 72 hours and unstake
      await time.increase(72 * 3600 + 1);
      await staking.connect(user1).unstake([1n]);

      // Restake the exact same NFT #1
      await staking.connect(user1).stake([1n]);

      // Initial spins awarded must STILL BE 1, not 2!
      expect(await staking.initialSpinsAwarded(user1.address)).to.equal(1n);
    });
  });

  describe("4. Supply Caps & Security Controls", function () {
    it("Should allow owner to withdraw mint revenue", async function () {
      const unitPrice = await nft.getMintPriceInWei();
      await nft.connect(user1).mint(2n, ethers.ZeroAddress, { value: unitPrice * 2n });

      const contractBalance = await ethers.provider.getBalance(await nft.getAddress());
      expect(contractBalance).to.equal(unitPrice * 2n);

      const ownerPreBal = await ethers.provider.getBalance(owner.address);
      const tx = await nft.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasSpent = receipt!.gasUsed * receipt!.gasPrice;

      const ownerPostBal = await ethers.provider.getBalance(owner.address);
      expect(ownerPostBal - ownerPreBal).to.equal(contractBalance - gasSpent);
    });

    it("Non-owner cannot withdraw mint revenue or pause contracts", async function () {
      await expect(
        nft.connect(user1).withdraw()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");

      await expect(
        nft.connect(user1).pause()
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");

      await expect(
        staking.connect(user1).pause()
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });
});

