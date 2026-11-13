# Agent Legends 2.0 — Web3 NFT Minting, 72h Staking & Spin-to-Earn Platform

A production-ready Web3 gaming and bounty ecosystem deployed on **BNB Smart Chain (BSC)**.

Agent Legends 2.0 combines decentralized ERC-721 token mechanics, dynamic Chainlink BNB/USD oracle pricing, a mandatory 72-hour staking custody vault, a server-side cryptographically secure pseudo-random number generator (CSPRNG) prize wheel, and an audited administrative USDT manual payout pipeline with real-time on-chain transaction verification.

---

## 1. System Architecture & Tech Stack

```
                               ┌─────────────────────────────────────────────────────────────┐
                               │                    Agent Legends 2.0 UI                     │
                               │        Next.js 14 (App Router) • Wagmi • Viem • Tailwind    │
                               └──────────────┬───────────────────────────────┬──────────────┘
                                              │                               │
                                       Web3 Transactions               REST / JSON-RPC
                                              │                               │
                                              ▼                               ▼
                      ┌─────────────────────────────────┐   ┌───────────────────────────────────┐
                      │      BNB Smart Chain (EVM)      │   │          Backend Services         │
                      ├─────────────────────────────────┤   ├───────────────────────────────────┤
                      │ • AgentLegendsNFT (ERC721)      │   │ • Secure CSPRNG Spin Engine       │
                      │ • AgentLegendsStaking (72h Lock)│   │ • BSC USDT Tx Receipt Verifier    │
                      │ • Chainlink BNB/USD Aggregator  │   │ • PostgreSQL / Prisma Analytics   │
                      │ • Official BSC-USD (USDT)       │   │ • Role-Based Admin Auth System    │
                      └─────────────────────────────────┘   └───────────────────────────────────┘
```

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Wagmi v2, Viem 2.x, RainbowKit v2, Lucide Icons, Canvas Confetti.
- **Smart Contracts:** Solidity 0.8.24, OpenZeppelin Contracts 5.x (`ERC721Enumerable`, `Ownable2Step`, `Pausable`, `ReentrancyGuard`).
- **Oracles:** Chainlink BNB/USD Aggregator with strict 3-hour staleness and round-id validation.
- **Randomness Engine:** Server-side Node.js Cryptographically Secure Pseudo-Random Number Generator (`crypto.randomInt(0, 10000)` and 256-bit audit seeds).
- **Off-chain Storage & Indexing:** PostgreSQL with Prisma ORM, Cloudflare R2 / IPFS decentralized metadata.
- **Payout Settlement:** Admin-dispatched USDT transactions verified directly on-chain via BSC JSON-RPC.

---

## 2. Core Business Rules

### A. NFT Minting & Dynamic Pricing
- **Maximum Supply:** Strictly capped at **10,000 NFTs** (`MAX_SUPPLY = 10000`).
- **Mint Price:** Fixed at **$0.20 USD equivalent in BNB** via Chainlink BNB/USD Aggregator.
- **Formula:**
  $$\text{costInWei} = \frac{0.20 \times 10^8 \times 10^{18}}{\text{BNBPrice}_{\text{oracle}}}$$
- **Multi-Mint:** Users can mint 1 to 20 NFTs per transaction.
- **Refund Guarantee:** Any excess BNB sent by user wallets is immediately refunded in the same transaction.
- **Oracle Staleness Guardrails:** Transactions revert if `updatedAt` is stale (> 3 hours), price $\le 0$, or `answeredInRound < roundId`.

### B. NFT Staking & 72-Hour Custody Lock
- **Mandatory Duration:** Staked NFTs are locked for **exactly 72 hours** from the timestamp of staking. Unstaking before 72 hours reverts with `StakingLocked()`.
- **Single Initial Spin Rule:** Every NFT generates **exactly one initial spin credit** upon its first successful stake (`hasGeneratedInitialSpin[tokenId]`).
- **Restaking Protection:** An NFT that has already been staked once can be unstaked and restaked freely, but **will never duplicate an initial spin credit**.
- **Credit Preservation:** Unused spin credits are preserved in the user's account even after unstaking.

### C. Spin-to-Earn Bounty Wheel
- **Randomness Disclosure:** Platform explicitly discloses server-side CSPRNG operation. Outcomes are computed securely on the backend and are not on-chain Chainlink VRF results.
- **Probability Distribution (10,000 Basis Points):**
  | Reward | Probability | Basis Points | Outcome Code | Payout Mode |
  |---|---:|---:|---|---|
  | **$0.10 USDT** | 80% | 0 – 7,999 | `USD_0_10` | Manual Verified Payout |
  | **$0.20 USDT** | 10% | 8,000 – 8,999 | `USD_0_20` | Manual Verified Payout |
  | **$0.50 USDT** | 1% | 9,000 – 9,099 | `USD_0_50` | Manual Verified Payout |
  | **$0.70 USDT** | 1% | 9,100 – 9,199 | `USD_0_70` | Manual Verified Payout |
  | **$1.00 USDT** | 1% | 9,200 – 9,299 | `USD_1_00` | Manual Verified Payout |
  | **1 Free Spin** | 2% | 9,300 – 9,499 | `FREE_SPIN` | Instant Credit (+1 Spin) |
  | **Try Your Luck** | 5% | 9,500 – 9,999 | `TRY_YOUR_LUCK` | None |
- Every spin receives a unique, auditable ID (e.g., `SPIN-1718293-A8F2`) with 256-bit cryptographic seed.

### D. Manual USDT Payout Pipeline
1. User spins the prize wheel.
2. Server determines outcome via CSPRNG and stores record in the database as `PENDING`.
3. The reward appears in the private, wallet-authenticated Admin Dashboard under the Pending Queue.
4. Administrator dispatches official BSC USDT to the winner's wallet.
5. Administrator submits the transaction hash into the payout verification engine.
6. Backend queries BNB Smart Chain JSON-RPC:
   - Validates transaction receipt status is `success`.
   - Validates destination contract matches the official USDT contract (`0x55d3...` on Mainnet, `0x3376...` on Testnet, 18 decimals).
   - Validates `Transfer` event recipient matches the winner's wallet.
   - Validates transferred USDT value matches the reward amount.
7. Status updates to `PAID` only upon successful on-chain confirmation.

### E. Referral Syndicate (3 Referrals = 1 Free NFT)
- **Unique URL:** Each wallet generates a permanent link: `https://agentlegends.xyz/?ref=0x...`
- **Milestone Rule:** Every **3 successfully referred wallets** that mint $\ge 1$ NFT unlocks **1 free Agent Legends NFT**.
- **Cumulative Milestones:** 3 referrals = 1 free NFT, 6 = 2 free NFTs, 9 = 3 free NFTs, 12 = 4 free NFTs, etc.
- **Permanent Attribution:** Locked upon the referee's first successful mint.
- **Self-referrals:** Strictly prohibited and rejected by smart contracts.
- **Supply Cap Inclusion:** Free referral NFTs count toward the 10,000 maximum collection supply. If sold out, unclaimed entitlements remain recorded on-chain.

---

## 3. Verified Contract Addresses

| Contract | Network | Address |
|---|---|---|
| **AgentLegendsNFT** | BSC Testnet (97) | `0x446B233261765c71a396faeE1a9420b99fa51829` |
| **AgentLegendsStaking** | BSC Testnet (97) | `0x2B1A6a17b2bC0cfaEea538fC0Fcf88927b233a00` |
| **Official BSC-USD (USDT)** | BSC Testnet (97) | `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` (18 Decimals) |
| **Chainlink BNB/USD Feed** | BSC Testnet (97) | `0x2514895c78B50853799fB792454453076C104B06` (8 Decimals) |
| **AgentLegendsNFT** | BSC Mainnet (56) | `0x89D22fBeDdB1A8c61e4796B07DE2592518eE4F32` |
| **AgentLegendsStaking** | BSC Mainnet (56) | `0x53D8330cfdE0e633d62325E67a8ff17f7300c3b8` |
| **Official Binance-Peg USDT**| BSC Mainnet (56) | `0x55d398326f99059fF775485246999027B3197955` (18 Decimals) |
| **Chainlink BNB/USD Feed** | BSC Mainnet (56) | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` (8 Decimals) |

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js v20+ / v22+
- npm or pnpm
- PostgreSQL (or local fallback store)

### Installation
```bash
# Clone the repository
git clone git@github.com:agent-legends/agent.git
cd agent

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your `PRIVATE_KEY`, `BSCSCAN_API_KEY`, and `DATABASE_URL`.

### Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Smart Contract Testing & Deployment

### Compile Contracts
```bash
npx hardhat compile
```

### Run Full Test Suite
```bash
npx hardhat test
```
The test suite validates:
1. Dynamic BNB price calculation via Chainlink oracle at varying price points ($600, $300).
2. Excess BNB refund mechanics.
3. Referral milestone accounting (3 referrals = 1 free NFT) and self-referral prevention.
4. 72-hour staking custody locks with time-travel simulation.
5. Protection against duplicate initial spin generation upon restake.
6. Owner revenue withdrawals and unauthorized role protections.

### Deploy to BSC Testnet
```bash
npx hardhat run scripts/deploy.ts --network bscTestnet
```

### Deploy to BSC Mainnet
```bash
npx hardhat run scripts/deploy.ts --network bscMainnet
```

### Contract Verification on BSCScan
```bash
# Verify NFT Contract
npx hardhat verify --network bscTestnet <NFT_CONTRACT_ADDRESS> "<OWNER_ADDRESS>" "<PRICE_FEED_ADDRESS>" "ipfs://bafybeidczpaz457x54jlwv2m3v3iugn56t4j65e5u7pwy5lq77kwe3q42a/"

# Verify Staking Contract
npx hardhat verify --network bscTestnet <STAKING_CONTRACT_ADDRESS> "<OWNER_ADDRESS>" "<NFT_CONTRACT_ADDRESS>"
```

---

## 6. Security & Economic Assumptions
1. **Solvency Separation:** Mint revenue collected in the NFT contract is isolated from the USDT prize reserve wallet.
2. **Double-Spend Prevention:** Spin IDs are unique, and payouts are locked against re-verification once marked `PAID`.
3. **Immutable History:** Finalized payouts and spin results cannot be modified or purged by administrators.
4. **Permanent Attribution:** A referee's referrer is locked on their first successful mint and cannot be altered.

---

## 7. License
MIT License. Developed for the Agent Legends 2.0 Web3 Ecosystem.

