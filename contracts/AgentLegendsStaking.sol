// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentLegendsStaking
 * @notice Production-grade NFT Staking contract for Agent Legends 2.0 on BNB Smart Chain.
 * @dev Enforces:
 *      1. Minimum 72-hour staking duration per NFT before unstaking is permitted.
 *      2. Exactly one initial spin credit generated upon an NFT's first stake.
 *      3. Restaking NEVER generates an additional initial spin credit.
 *      4. Safe custody and batch operations.
 */
contract AgentLegendsStaking is IERC721Receiver, Ownable2Step, Pausable, ReentrancyGuard {
    uint256 public constant MIN_STAKING_DURATION = 72 hours;

    struct StakeRecord {
        address owner;
        uint64 stakedAt;
    }

    IERC721 public immutable nftContract;

    // TokenId => Staking info
    mapping(uint256 => StakeRecord) public stakes;

    // User => list of staked token IDs
    mapping(address => uint256[]) private _userStakedTokens;
    mapping(uint256 => uint256) private _stakedTokenIndex;

    // Total staked NFTs in contract
    uint256 public totalStakedCount;

    // Prevents an NFT from ever generating another initial spin upon restake
    mapping(uint256 => bool) public hasGeneratedInitialSpin;

    // Cumulative initial spins awarded to each wallet via staking
    mapping(address => uint256) public initialSpinsAwarded;

    // Events
    event NftStaked(address indexed user, uint256 indexed tokenId, uint64 stakedAt, bool generatedSpin);
    event NftUnstaked(address indexed user, uint256 indexed tokenId, uint256 durationStaked);
    event InitialSpinGenerated(address indexed user, uint256 indexed tokenId);

    // Custom Errors
    error NotTokenOwner(uint256 tokenId, address caller);
    error StakingLocked(uint256 tokenId, uint256 unlockTimestamp, uint256 currentTimestamp);
    error EmptyTokenList();
    error ZeroAddress();

    constructor(
        address initialOwner,
        address _nftContract
    ) Ownable(initialOwner) {
        if (_nftContract == address(0)) revert ZeroAddress();
        nftContract = IERC721(_nftContract);
    }

    // ==========================================
    // STAKING
    // ==========================================

    /**
     * @notice Stake multiple NFTs
     * @param tokenIds Array of token IDs to stake
     */
    function stake(uint256[] calldata tokenIds) external whenNotPaused nonReentrant {
        if (tokenIds.length == 0) revert EmptyTokenList();

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (nftContract.ownerOf(tokenId) != msg.sender) {
                revert NotTokenOwner(tokenId, msg.sender);
            }

            // Transfer NFT into staking contract custody
            nftContract.safeTransferFrom(msg.sender, address(this), tokenId);

            stakes[tokenId] = StakeRecord({
                owner: msg.sender,
                stakedAt: uint64(block.timestamp)
            });

            _userStakedTokens[msg.sender].push(tokenId);
            _stakedTokenIndex[tokenId] = _userStakedTokens[msg.sender].length - 1;
            totalStakedCount++;

            // Initial spin generated ONLY ONCE per NFT lifetime
            bool generatedSpin = false;
            if (!hasGeneratedInitialSpin[tokenId]) {
                hasGeneratedInitialSpin[tokenId] = true;
                initialSpinsAwarded[msg.sender] += 1;
                generatedSpin = true;
                emit InitialSpinGenerated(msg.sender, tokenId);
            }

            emit NftStaked(msg.sender, tokenId, uint64(block.timestamp), generatedSpin);
        }
    }

    /**
     * @notice Unstake multiple NFTs after the 72-hour lock period
     * @param tokenIds Array of token IDs to unstake
     */
    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        if (tokenIds.length == 0) revert EmptyTokenList();

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            StakeRecord memory record = stakes[tokenId];

            if (record.owner != msg.sender) {
                revert NotTokenOwner(tokenId, msg.sender);
            }

            uint256 unlockTime = uint256(record.stakedAt) + MIN_STAKING_DURATION;
            if (block.timestamp < unlockTime) {
                revert StakingLocked(tokenId, unlockTime, block.timestamp);
            }

            // Swap and pop from user's staked tokens list
            uint256 tokenIndex = _stakedTokenIndex[tokenId];
            uint256 lastIndex = _userStakedTokens[msg.sender].length - 1;

            if (tokenIndex != lastIndex) {
                uint256 lastTokenId = _userStakedTokens[msg.sender][lastIndex];
                _userStakedTokens[msg.sender][tokenIndex] = lastTokenId;
                _stakedTokenIndex[lastTokenId] = tokenIndex;
            }

            _userStakedTokens[msg.sender].pop();
            delete _stakedTokenIndex[tokenId];
            delete stakes[tokenId];
            totalStakedCount--;

            uint256 duration = block.timestamp - uint256(record.stakedAt);

            // Safe transfer NFT back to owner
            nftContract.safeTransferFrom(address(this), msg.sender, tokenId);

            emit NftUnstaked(msg.sender, tokenId, duration);
        }
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Returns array of staked token IDs for a user
     */
    function getUserStakedTokens(address user) external view returns (uint256[] memory) {
        return _userStakedTokens[user];
    }

    /**
     * @notice Details for a staked token
     * @return owner The staker address
     * @return stakedAt Unix timestamp of when staked
     * @return unlockTime Unix timestamp when unstaking becomes allowed
     * @return isLocked Whether token is currently locked within 72 hours
     */
    function getStakeDetails(uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint64 stakedAt,
            uint256 unlockTime,
            bool isLocked
        )
    {
        StakeRecord memory record = stakes[tokenId];
        owner = record.owner;
        stakedAt = record.stakedAt;
        if (stakedAt > 0) {
            unlockTime = uint256(stakedAt) + MIN_STAKING_DURATION;
            isLocked = block.timestamp < unlockTime;
        } else {
            unlockTime = 0;
            isLocked = false;
        }
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

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

