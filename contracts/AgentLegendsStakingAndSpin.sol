// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAggregatorV3.sol";
import "./interfaces/IVRFCoordinatorV2.sol";
import "./VRFConsumerBaseV2.sol";

/**
 * @title AgentLegendsStakingAndSpin
 * @notice Production-grade Staking and Chainlink VRF Spin-to-Earn contract for Agent Legends 2.0
 * @dev Guarantees single-credit per NFT, preserves spins after unstake, and enforces solvency invariants.
 */
contract AgentLegendsStakingAndSpin is IERC721Receiver, Ownable2Step, Pausable, ReentrancyGuard, VRFConsumerBaseV2 {
    enum PrizeType {
        None,         // 0
        Usd10Cents,   // 1: $0.10 (80%)
        Usd20Cents,   // 2: $0.20 (10%)
        Usd50Cents,   // 3: $0.50 (1%)
        Usd1Dollar,   // 4: $1.00 (1%)
        FreeSpin,     // 5: 1 Free Spin (2%)
        TryYourLuck   // 6: No prize (6%)
    }

    struct SpinRequest {
        address player;
        uint256 requestTimestamp;
        bool fulfilled;
        PrizeType prize;
        uint256 rewardAmountBnb;
        uint256 randomRoll;
    }

    // Contracts & Oracles
    IERC721 public immutable nftContract;
    IAggregatorV3 public priceFeed;
    IVRFCoordinatorV2 public vrfCoordinator;

    // Chainlink VRF Settings
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit = 300_000;
    uint16 public requestConfirmations = 3;
    uint32 public constant NUM_WORDS = 1;

    // Price feed staleness
    uint256 public maxPriceStaleness = 3 hours;

    // Staking tracking
    mapping(uint256 => address) public stakedOwner;
    mapping(address => uint256[]) private _userStakedTokens;
    mapping(uint256 => uint256) private _stakedTokenIndex;
    uint256 public totalStakedNfts;

    // Initial spin protection: NFT cannot grant initial credit more than once
    mapping(uint256 => bool) public hasGeneratedInitialSpin;

    // Spin credits
    mapping(address => uint256) public spinCredits;
    uint256 public totalSpinsCreatedByStaking;
    uint256 public totalSpinsRequested;
    uint256 public totalSpinsFulfilled;
    uint256 public totalFreeSpinsAwarded;

    // VRF Spin Requests
    mapping(uint256 => SpinRequest) public spinRequests;
    mapping(address => uint256[]) private _userSpinRequests;

    // Rewards & Solvency
    mapping(address => uint256) public claimableRewards;
    uint256 public totalOutstandingLiabilities; // Sum of all user claimable balances
    uint256 public totalRewardsDistributedBnb;
    uint256 public totalClaimedRewardsBnb;

    // Events
    event NftStaked(address indexed user, uint256 indexed tokenId, bool generatedCredit);
    event NftUnstaked(address indexed user, uint256 indexed tokenId);
    event SpinCreditAwarded(address indexed user, uint256 indexed tokenId, uint256 amount, string reason);
    event SpinRequested(uint256 indexed requestId, address indexed player, uint256 timestamp);
    event SpinFulfilled(
        uint256 indexed requestId,
        address indexed player,
        PrizeType prize,
        uint256 rewardAmountBnb,
        uint256 randomRoll
    );
    event RewardsClaimed(address indexed player, uint256 amount);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event SurplusWithdrawn(address indexed owner, uint256 amount);
    event PriceFeedUpdated(address indexed newFeed, uint256 maxStaleness);
    event VrfConfigUpdated(bytes32 keyHash, uint64 subId, uint32 gasLimit, uint16 confirmations);

    constructor(
        address initialOwner,
        address _nftContract,
        address _priceFeed,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    )
        Ownable(initialOwner)
        VRFConsumerBaseV2(_vrfCoordinator)
    {
        require(_nftContract != address(0), "Invalid NFT address");
        require(_priceFeed != address(0), "Invalid price feed address");
        require(_vrfCoordinator != address(0), "Invalid coordinator");

        nftContract = IERC721(_nftContract);
        priceFeed = IAggregatorV3(_priceFeed);
        vrfCoordinator = IVRFCoordinatorV2(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    // ==========================================
    // STAKING FUNCTIONS
    // ==========================================

    /**
     * @notice Stake multiple NFTs in one transaction
     * @param tokenIds Array of token IDs to stake
     */
    function stake(uint256[] calldata tokenIds) external whenNotPaused nonReentrant {
        require(tokenIds.length > 0, "No tokens provided");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(nftContract.ownerOf(tokenId) == msg.sender, "Caller not token owner");

            // Safe transfer token from caller to staking contract
            nftContract.safeTransferFrom(msg.sender, address(this), tokenId);

            stakedOwner[tokenId] = msg.sender;
            _userStakedTokens[msg.sender].push(tokenId);
            _stakedTokenIndex[tokenId] = _userStakedTokens[msg.sender].length - 1;
            totalStakedNfts++;

            // Exactly ONE initial spin credit ever per NFT
            bool generatedCredit = false;
            if (!hasGeneratedInitialSpin[tokenId]) {
                hasGeneratedInitialSpin[tokenId] = true;
                spinCredits[msg.sender] += 1;
                totalSpinsCreatedByStaking++;
                generatedCredit = true;
                emit SpinCreditAwarded(msg.sender, tokenId, 1, "Initial Staking");
            }

            emit NftStaked(msg.sender, tokenId, generatedCredit);
        }
    }

    /**
     * @notice Unstake multiple NFTs
     * @dev Unused spin credits are strictly preserved!
     * @param tokenIds Array of token IDs to unstake
     */
    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "No tokens provided");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(stakedOwner[tokenId] == msg.sender, "Not token owner");

            // Remove from user's staked token array with swap-and-pop
            uint256 tokenIndex = _stakedTokenIndex[tokenId];
            uint256 lastIndex = _userStakedTokens[msg.sender].length - 1;

            if (tokenIndex != lastIndex) {
                uint256 lastTokenId = _userStakedTokens[msg.sender][lastIndex];
                _userStakedTokens[msg.sender][tokenIndex] = lastTokenId;
                _stakedTokenIndex[lastTokenId] = tokenIndex;
            }

            _userStakedTokens[msg.sender].pop();
            delete _stakedTokenIndex[tokenId];
            delete stakedOwner[tokenId];
            totalStakedNfts--;

            // Return NFT to caller
            nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

            emit NftUnstaked(msg.sender, tokenId);
        }
    }

    // ==========================================
    // SPIN & EARN (CHAINLINK VRF)
    // ==========================================

    /**
     * @notice Request a random spin using an available spin credit
     * @return requestId The Chainlink VRF request ID
     */
    function requestSpin() external whenNotPaused nonReentrant returns (uint256 requestId) {
        require(spinCredits[msg.sender] > 0, "No spin credits available");

        // Deduct 1 credit before triggering VRF
        spinCredits[msg.sender] -= 1;
        totalSpinsRequested++;

        requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            NUM_WORDS
        );

        spinRequests[requestId] = SpinRequest({
            player: msg.sender,
            requestTimestamp: block.timestamp,
            fulfilled: false,
            prize: PrizeType.None,
            rewardAmountBnb: 0,
            randomRoll: 0
        });

        _userSpinRequests[msg.sender].push(requestId);

        emit SpinRequested(requestId, msg.sender, block.timestamp);
    }

    /**
     * @dev VRF callback invoked exclusively by Chainlink Coordinator
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        SpinRequest storage req = spinRequests[requestId];
        require(req.player != address(0), "Non-existent request");
        require(!req.fulfilled, "Already fulfilled");

        req.fulfilled = true;
        totalSpinsFulfilled++;

        // Roll: 0 to 9,999 (10,000 basis points)
        uint256 roll = randomWords[0] % 10_000;
        req.randomRoll = roll;

        PrizeType prize;
        uint256 rewardBnb = 0;

        /**
         * Approved Probabilities:
         * - $0.10 BNB reward: 80% (0 .. 7999)
         * - $0.20 BNB reward: 10% (8000 .. 8999)
         * - $0.50 BNB reward: 1%  (9000 .. 9099)
         * - $1.00 BNB reward: 1%  (9100 .. 9199)
         * - One free spin:    2%  (9200 .. 9399)
         * - Try Your Luck:    6%  (9400 .. 9999)
         * ($0.70 prize is deliberately excluded/reserved as specified)
         */
        if (roll < 8000) {
            prize = PrizeType.Usd10Cents;
            rewardBnb = _usdToBnb(10_000_000); // 0.10 USD (8 dec)
        } else if (roll < 9000) {
            prize = PrizeType.Usd20Cents;
            rewardBnb = _usdToBnb(20_000_000); // 0.20 USD (8 dec)
        } else if (roll < 9100) {
            prize = PrizeType.Usd50Cents;
            rewardBnb = _usdToBnb(50_000_000); // 0.50 USD (8 dec)
        } else if (roll < 9200) {
            prize = PrizeType.Usd1Dollar;
            rewardBnb = _usdToBnb(100_000_000); // 1.00 USD (8 dec)
        } else if (roll < 9400) {
            prize = PrizeType.FreeSpin;
            spinCredits[req.player] += 1;
            totalFreeSpinsAwarded++;
            emit SpinCreditAwarded(req.player, 0, 1, "VRF Free Spin Reward");
        } else {
            prize = PrizeType.TryYourLuck;
        }

        req.prize = prize;
        req.rewardAmountBnb = rewardBnb;

        if (rewardBnb > 0) {
            claimableRewards[req.player] += rewardBnb;
            totalOutstandingLiabilities += rewardBnb;
            totalRewardsDistributedBnb += rewardBnb;
        }

        emit SpinFulfilled(requestId, req.player, prize, rewardBnb, roll);
    }

    /**
     * @dev Converts USD amount (8 decimals) to BNB wei using Chainlink oracle
     */
    function _usdToBnb(uint256 usdAmountE8) internal view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(price > 0, "Invalid oracle price");
        require(updatedAt > 0 && block.timestamp - updatedAt <= maxPriceStaleness, "Stale price feed");
        require(answeredInRound >= roundId, "Stale round");

        uint8 feedDecimals = priceFeed.decimals();
        uint256 normalizedPrice = uint256(price);

        if (feedDecimals != 8) {
            if (feedDecimals > 8) {
                normalizedPrice = normalizedPrice / (10 ** (feedDecimals - 8));
            } else {
                normalizedPrice = normalizedPrice * (10 ** (8 - feedDecimals));
            }
        }

        // bnbWei = (usdAmountE8 * 1e18) / normalizedPrice
        return (usdAmountE8 * 1e18) / normalizedPrice;
    }

    // ==========================================
    // REWARDS CLAIM & LIQUIDITY
    // ==========================================

    /**
     * @notice Claim all accrued BNB rewards
     */
    function claimRewards() external nonReentrant {
        uint256 amount = claimableRewards[msg.sender];
        require(amount > 0, "No rewards available to claim");
        require(address(this).balance >= amount, "Reward pool temporarily illiquid");

        // Checks-Effects-Interactions
        claimableRewards[msg.sender] = 0;
        totalOutstandingLiabilities -= amount;
        totalClaimedRewardsBnb += amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "BNB transfer failed");

        emit RewardsClaimed(msg.sender, amount);
    }

    /**
     * @notice Deposit funds into the reward pool to back payouts
     */
    function depositRewardPool() external payable {
        require(msg.value > 0, "Must deposit non-zero BNB");
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    receive() external payable {
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ONLY funds that are demonstrably surplus to all outstanding liabilities
     * @dev Guarantees player claimable rewards cannot be removed by admin
     * @param amount Amount of surplus BNB to withdraw
     */
    function withdrawSurplus(uint256 amount) external onlyOwner nonReentrant {
        uint256 poolBalance = address(this).balance;
        require(poolBalance > totalOutstandingLiabilities, "No surplus funds available");

        uint256 availableSurplus = poolBalance - totalOutstandingLiabilities;
        require(amount <= availableSurplus, "Requested amount exceeds surplus");

        (bool success, ) = owner().call{value: amount}("");
        require(success, "Surplus transfer failed");

        emit SurplusWithdrawn(owner(), amount);
    }

    // ==========================================
    // VIEW FUNCTIONS & ANALYTICS
    // ==========================================

    function getUserStakedTokens(address user) external view returns (uint256[] memory) {
        return _userStakedTokens[user];
    }

    function getUserSpinRequests(address user) external view returns (uint256[] memory) {
        return _userSpinRequests[user];
    }

    function getRewardPoolHealth()
        external
        view
        returns (
            uint256 poolBalance,
            uint256 liabilities,
            uint256 surplus,
            bool isSolvent
        )
    {
        poolBalance = address(this).balance;
        liabilities = totalOutstandingLiabilities;
        if (poolBalance >= liabilities) {
            surplus = poolBalance - liabilities;
            isSolvent = true;
        } else {
            surplus = 0;
            isSolvent = false;
        }
    }

    // ==========================================
    // ADMIN CONFIGURATION
    // ==========================================

    function setPriceFeed(address newFeed, uint256 newMaxStaleness) external onlyOwner {
        require(newFeed != address(0), "Invalid feed");
        require(newMaxStaleness >= 60, "Staleness too short");
        priceFeed = IAggregatorV3(newFeed);
        maxPriceStaleness = newMaxStaleness;
        emit PriceFeedUpdated(newFeed, newMaxStaleness);
    }

    function setVrfConfig(
        address newCoordinator,
        bytes32 newKeyHash,
        uint64 newSubId,
        uint32 newGasLimit,
        uint16 newConfirmations
    ) external onlyOwner {
        require(newCoordinator != address(0), "Invalid coordinator");
        vrfCoordinator = IVRFCoordinatorV2(newCoordinator);
        keyHash = newKeyHash;
        subscriptionId = newSubId;
        callbackGasLimit = newGasLimit;
        requestConfirmations = newConfirmations;
        emit VrfConfigUpdated(newKeyHash, newSubId, newGasLimit, newConfirmations);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

