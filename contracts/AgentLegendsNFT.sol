// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAggregatorV3.sol";

/**
 * @title AgentLegendsNFT
 * @notice Production-grade ERC721 NFT contract for Agent Legends 2.0 on BNB Smart Chain.
 * @dev Enforces:
 *      1. Maximum 10,000 supply (including referral free NFTs).
 *      2. Dynamic BNB pricing for $0.20 USD via Chainlink BNB/USD oracle with staleness checks.
 *      3. Multi-minting up to 20 NFTs per transaction.
 *      4. Referral system: 3 referred wallets = 1 free NFT (cumulative, 6=2, 9=3, 12=4...).
 *      5. Self-referrals strictly prohibited; referral attribution permanent on first mint.
 *      6. Unclaimed referral free NFTs recorded even if sold out.
 */
contract AgentLegendsNFT is ERC721Enumerable, Ownable2Step, Pausable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MAX_MINT_PER_TX = 20;

    // $0.20 USD with 8 decimals (standard Chainlink USD aggregator decimals)
    uint256 public constant MINT_PRICE_USD_E8 = 20_000_000; // 0.20 * 10^8

    // Referral milestone: 3 successful referred wallets = 1 free NFT
    uint256 public constant REFERRALS_PER_FREE_NFT = 3;

    IAggregatorV3 public priceFeed;
    uint256 public maxPriceStaleness = 3 hours;
    string public baseTokenURI;

    uint256 private _nextTokenId = 1;

    // Referral tracking
    mapping(address => address) public userReferrer;
    mapping(address => uint256) public referralCount; // unique referred wallets that minted
    mapping(address => uint256) public referralNftCount; // total NFTs minted through referrals
    mapping(address => bool) public hasMinted;
    mapping(address => uint256) public referralRewardsClaimed; // number of free NFTs claimed by referrer

    // Events
    event AgentMinted(
        address indexed minter,
        uint256 indexed startTokenId,
        uint256 quantity,
        uint256 bnbCost,
        address indexed referrer
    );
    event ReferralAttributed(address indexed referee, address indexed referrer);
    event ReferralRewardClaimed(address indexed referrer, uint256 quantity, uint256 startTokenId);
    event PriceFeedUpdated(address indexed newFeed, uint256 maxStaleness);
    event BaseURIUpdated(string newBaseURI);
    event FundsWithdrawn(address indexed to, uint256 amount);

    // Custom Errors
    error ExceedsMaxSupply(uint256 requested, uint256 remaining);
    error InvalidMintQuantity();
    error InsufficientBnbPayment(uint256 sent, uint256 requiredAmount);
    error StaleOrInvalidPrice();
    error ZeroAddress();
    error TransferFailed();
    error NoUnclaimedReferralRewards();

    constructor(
        address initialOwner,
        address _priceFeed,
        string memory _initialBaseURI
    ) ERC721("Agent Legends 2.0", "ALEGEND") Ownable(initialOwner) {
        if (_priceFeed == address(0)) revert ZeroAddress();
        priceFeed = IAggregatorV3(_priceFeed);
        baseTokenURI = _initialBaseURI;
    }

    // ==========================================
    // ORACLE & PRICING
    // ==========================================

    /**
     * @notice Computes required BNB in wei for 1 NFT ($0.20 USD equivalent)
     */
    function getMintPriceInWei() public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        if (price <= 0 || updatedAt == 0 || block.timestamp - updatedAt > maxPriceStaleness || answeredInRound < roundId) {
            revert StaleOrInvalidPrice();
        }

        uint8 feedDecimals = priceFeed.decimals();
        uint256 normalizedPrice = uint256(price);

        if (feedDecimals != 8) {
            if (feedDecimals > 8) {
                normalizedPrice = normalizedPrice / (10 ** (feedDecimals - 8));
            } else {
                normalizedPrice = normalizedPrice * (10 ** (8 - feedDecimals));
            }
        }

        // cost = (MINT_PRICE_USD_E8 * 1e18) / normalizedPrice
        return (MINT_PRICE_USD_E8 * 1e18) / normalizedPrice;
    }

    // ==========================================
    // MINTING
    // ==========================================

    /**
     * @notice Mint Agent Legends NFTs
     * @param quantity Number of NFTs to mint (1-20)
     * @param referrer Optional referrer address (address(0) if none)
     */
    function mint(uint256 quantity, address referrer) external payable whenNotPaused nonReentrant {
        if (quantity == 0 || quantity > MAX_MINT_PER_TX) revert InvalidMintQuantity();
        if (totalSupply() + quantity > MAX_SUPPLY) {
            revert ExceedsMaxSupply(quantity, MAX_SUPPLY - totalSupply());
        }

        uint256 unitPrice = getMintPriceInWei();
        uint256 totalCost = unitPrice * quantity;
        if (msg.value < totalCost) revert InsufficientBnbPayment(msg.value, totalCost);

        // Process referral logic
        address effectiveReferrer = _processReferral(msg.sender, referrer, quantity);

        uint256 startId = _nextTokenId;
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId;
            _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }

        // Refund any excess BNB sent
        if (msg.value > totalCost) {
            uint256 excess = msg.value - totalCost;
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            if (!refundSuccess) revert TransferFailed();
        }

        emit AgentMinted(msg.sender, startId, quantity, totalCost, effectiveReferrer);
    }

    /**
     * @dev Enforces permanent referral attribution, prohibits self-referrals, and increments milestone counts
     */
    function _processReferral(address minter, address candidateReferrer, uint256 quantity) internal returns (address) {
        address assigned = userReferrer[minter];

        // Assign only on first time, preventing self-referral
        if (assigned == address(0) && candidateReferrer != address(0) && candidateReferrer != minter) {
            assigned = candidateReferrer;
            userReferrer[minter] = assigned;
            emit ReferralAttributed(minter, assigned);
        }

        if (assigned != address(0)) {
            // Only count referee once regardless of quantity
            if (!hasMinted[minter]) {
                referralCount[assigned] += 1;
            }
            referralNftCount[assigned] += quantity;
        }

        hasMinted[minter] = true;
        return assigned;
    }

    // ==========================================
    // REFERRAL FREE NFT CLAIMING
    // ==========================================

    /**
     * @notice Total free NFTs earned based on 3 referrals = 1 free NFT
     */
    function totalReferralRewardsEarned(address user) public view returns (uint256) {
        return referralCount[user] / REFERRALS_PER_FREE_NFT;
    }

    /**
     * @notice Unclaimed free NFTs for a referrer
     */
    function unclaimedReferralRewards(address user) public view returns (uint256) {
        uint256 earned = totalReferralRewardsEarned(user);
        uint256 claimed = referralRewardsClaimed[user];
        if (earned > claimed) {
            return earned - claimed;
        }
        return 0;
    }

    /**
     * @notice Claim earned referral free NFTs
     * @dev Free referral NFTs count toward the 10,000 maximum supply.
     *      If sold out, unclaimed entitlement remains recorded on-chain.
     * @param count Number of earned free NFTs to claim
     */
    function claimReferralRewards(uint256 count) external whenNotPaused nonReentrant {
        if (count == 0) revert InvalidMintQuantity();
        uint256 unclaimed = unclaimedReferralRewards(msg.sender);
        if (unclaimed < count) revert NoUnclaimedReferralRewards();

        if (totalSupply() + count > MAX_SUPPLY) {
            revert ExceedsMaxSupply(count, MAX_SUPPLY - totalSupply());
        }

        referralRewardsClaimed[msg.sender] += count;

        uint256 startId = _nextTokenId;
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _nextTokenId;
            _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }

        emit ReferralRewardClaimed(msg.sender, count, startId);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function setPriceFeed(address newFeed, uint256 newMaxStaleness) external onlyOwner {
        if (newFeed == address(0)) revert ZeroAddress();
        priceFeed = IAggregatorV3(newFeed);
        maxPriceStaleness = newMaxStaleness;
        emit PriceFeedUpdated(newFeed, newMaxStaleness);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Withdraw collected mint revenue to owner
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = owner().call{value: balance}("");
        if (!success) revert TransferFailed();
        emit FundsWithdrawn(owner(), balance);
    }
}
