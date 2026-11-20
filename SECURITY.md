# Security Policy & Audit Specification — Agent Legends 2.0

## 1. Overview
Agent Legends 2.0 is designed under the **Defense in Depth** principle. Staking custody, NFT minting supply, and USDT reward distributions are protected against reentrancy, oracle manipulation, duplicate claims, and administrative overreach.

---

## 2. Smart Contract Guardrails

### A. OpenZeppelin 5.x Standards
- **ERC721Enumerable:** Guarantees strict on-chain inventory tracking and token enumeration.
- **Ownable2Step:** Two-step ownership transfers prevent accidental transfer of administrative roles to invalid or blackhole addresses.
- **ReentrancyGuard:** `nonReentrant` modifier applied to `mint()`, `claimReferralRewards()`, `stake()`, and `unstake()`.
- **Pausable:** Emergency pause controls allow the owner to freeze minting or staking in response to external network anomalies.

### B. Strict Supply Cap (10,000 Max)
- Total NFT supply cannot exceed 10,000 under any circumstance.
- Both direct user mints and claimed referral rewards query `totalSupply() + count <= MAX_SUPPLY`.
- If 10,000 NFTs have been minted, subsequent claims revert with `ExceedsMaxSupply()`. Unclaimed referral rewards remain safely recorded on-chain.

### C. Oracle Security & Staleness Mitigation
- The minting price relies on the Chainlink BNB/USD Aggregator.
- Reverts if:
  1. `price <= 0` (Flash loan or oracle downtime protection).
  2. `block.timestamp - updatedAt > maxPriceStaleness` (Stale price feed guardrail, default 3 hours).
  3. `answeredInRound < roundId` (Incomplete round protection).

### D. 72-Hour Staking Custody & Anti-Restake Exploit
- Staked NFTs are held in the contract using `IERC721Receiver`.
- Every token records `stakes[tokenId] = { owner, stakedAt }`.
- Unstaking checks `block.timestamp >= stakes[tokenId].stakedAt + 72 hours`.
- **Duplicate Spin Prevention:**
  ```solidity
  mapping(uint256 => bool) public hasGeneratedInitialSpin;
  if (!hasGeneratedInitialSpin[tokenId]) {
      hasGeneratedInitialSpin[tokenId] = true;
      initialSpinsAwarded[msg.sender] += 1;
  }
  ```
  Unstaking and restaking the same NFT will **never** generate a second initial spin credit.

---

## 3. Backend & Randomness Architecture

### A. Cryptographically Secure Pseudo-Random Number Generation (CSPRNG)
- Uses Node.js `crypto.randomInt(0, 10000)` based on operating system entropy.
- Never uses insecure generators like `Math.random()`.
- Produces a unique 256-bit hexadecimal audit seed for every spin.

### B. Centralized Randomness Transparency
- The platform clearly and prominently discloses in all user interfaces that outcomes are generated via server-side CSPRNG and are not on-chain Chainlink VRF results.

### C. Manual USDT Payout & On-Chain Verification
- Winning records are stored in PostgreSQL/Prisma with status `PENDING`.
- Payouts are manually dispatched by platform administrators using the official BSC USDT contract.
- The administrator submits the transaction hash to the payout engine.
- Backend queries BNB Smart Chain via JSON-RPC, validates receipt `status === "success"`, verifies the `Transfer` event matches the winner address, and confirms the value.
- Status changes to `PAID` only after verification succeeds.
- Once marked `PAID`, payouts cannot be re-verified or modified.

---

## 4. Reporting Security Vulnerabilities
To report a security vulnerability or disclose an exploit, please email security@agentlegends.xyz or contact the core architecture team directly.

