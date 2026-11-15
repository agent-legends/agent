# Agent Legends 2.0 — Web3 NFT Minting, 72h Staking & Spin-to-Earn Platform

An in-development Web3 NFT minting, staking, spin, and referral platform targeting **BNB Smart Chain (BSC)**. It has not been audited or cleared for mainnet deployment. Configure and validate contracts, services, metadata, and payout reserves on testnet before production use.

Agent Legends 2.0 combines ERC-721 token mechanics, dynamic Chainlink BNB/USD oracle pricing, a mandatory 72-hour staking custody vault, a server-side cryptographically secure random prize wheel, and an administrator-audited USDT payout pipeline with on-chain transaction verification.

---

## 1. System Architecture & Tech Stack

```
                               ┌─────────────────────────────────────────────────────────────┐
                               │                    Agent Legends 2.0 UI                     │
                               │        Next.js 15 (App Router) • Wagmi • Viem • Tailwind    │
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

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Wagmi v2, Viem 2.x, RainbowKit v2, Lucide Icons, Canvas Confetti.
- **Smart Contracts:** Solidity 0.8.24, OpenZeppelin Contracts 5.x (`ERC721Enumerable`, `Ownable2Step`, `Pausable`, `ReentrancyGuard`).
- **Oracles:** Chainlink BNB/USD Aggregator with strict 3-hour staleness and round-id validation.
- **Randomness Engine:** Server-side Node.js cryptographically secure random number generator (`crypto.randomInt(0, 10000)`). Results are centralized and are not independently verifiable VRF outcomes.
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
- Every spin receives a unique ID and the selected random roll/outcome are stored in the administrative spin history. This does not make the centralized randomness independently verifiable.

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

## 3. Deployment Addresses

No Agent Legends NFT or staking contract address is hard-coded as a deployed production contract. Populate the matching `NEXT_PUBLIC_*_NFT_ADDRESS` and `NEXT_PUBLIC_*_STAKING_ADDRESS` values from a verified testnet deployment. Do not configure mainnet addresses until the testnet deployment, security review, and reserve/payout operations have been verified.

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js v20+ / v22+
- npm or pnpm
- PostgreSQL

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
Set `DATABASE_URL`, `BSC_CHAIN_ID`, `ADMIN_WALLETS`, `NEXT_PUBLIC_ADMIN_WALLETS`, and a randomly generated `ADMIN_SESSION_SECRET` of at least 32 characters. Keep the signing key out of source control. Configure the relevant chain contract addresses after deployment.

For local development, apply the schema with `npx prisma db push`. For a new production database, review the checked-in initial migration and apply it with `npx prisma migrate deploy`; do not use `db push` against production.

### Cloudflare Workers deployment

This project uses the official `@opennextjs/cloudflare` adapter. Build and deploy with:

```bash
npm run deploy
```

For Cloudflare Workers Builds, configure the Worker under **Settings > Build** with:

```text
Build command:  npx opennextjs-cloudflare build
Deploy command: npx opennextjs-cloudflare deploy
```

The build command must run first to generate `.open-next/worker.js` and `.open-next/assets`; the deploy command publishes those artifacts. Do not use `npx wrangler deploy` as the Workers Builds deploy command. Workers Builds commands are configured in the Cloudflare dashboard and are not controlled by `wrangler.jsonc`. The `npm run deploy` script above remains a local convenience that runs both OpenNext commands in sequence.

Set `DATABASE_URL` and `ADMIN_SESSION_SECRET` as Worker secrets with Wrangler; configure the Worker with the same server-side `ADMIN_WALLETS` allowlist used by the local app. The PostgreSQL client uses Prisma's `pg` driver adapter and Cloudflare's Node.js TCP support, so the database must accept connections from the Worker. Set `NEXT_PUBLIC_*` values in the deployment build environment because Next.js embeds those values in browser assets. Do not put private values in `NEXT_PUBLIC_*` variables or `wrangler.jsonc`.

The Worker only sets immutable caching for versioned `/_next/static/` assets. No shared ISR/data cache is enabled for user-specific or API responses.

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

### Mainnet deployment

Mainnet deployment is intentionally not a routine quick-start step. First deploy to BSC testnet, verify contract source and feed/token addresses, exercise mint/stake/referral/spin/payout flows, and complete an independent security review. Do not run a mainnet deployment until those checks and operational approvals are complete.

### Deploy to BSC Mainnet (only after the required reviews)
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
