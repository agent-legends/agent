# Agent Legends

Agent Legends is a Next.js dApp for the deployed Agent Legends NFT collection on BNB Smart Chain. It provides wallet-based minting, staking, referral, spin, and manually verified USDT payout flows.

## Verified BNB Smart Chain contracts

The mainnet contract addresses are configured in `src/config/contracts.ts` and have verified source/ABIs:

| Contract | BNB Smart Chain address |
|---|---|
| Agent Legends NFT | `0x3d8b78084BF69936AF661DD33C6F95f345E93702` |
| Staking | `0x7eaE685c150D655fA1bA419cCB6956816641a9f4` |
| Agent ID registry | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |

The project keeps the NFT, staking, and registry ABI subsets in `src/config/abis/`. Important integration details:

- The NFT mint is free; `quotePlatformFee(quantity)` provides the BNB platform fee and network gas is separate.
- NFT supply is read using `totalMinted()` and `MAX_SUPPLY()`.
- Staking accepts one token ID per `stake()` / `unstake()` call. Initial spin credits are checked using `spinCredits(address)`.
- NFT ownership is not enumerable in this deployment. The UI does not invent token IDs or metadata; the collection page reads `balanceOf` and links to the block explorer, while staking verifies a user-entered token ID on-chain.
- Referral eligibility and claim credits are read from `successfulReferrals(address)` and `referralNFTCredits(address)`. Claims call `claimReferralNFT()` with no arguments.
- Server-side spin outcomes use Node's cryptographic random generator and are not on-chain VRF results. USDT prizes are tracked in PostgreSQL and paid manually after transaction verification.

The testnet addresses are intentionally unset until a testnet deployment is selected. Set `NEXT_PUBLIC_TESTNET_NFT_ADDRESS`, `NEXT_PUBLIC_TESTNET_STAKING_ADDRESS`, and `NEXT_PUBLIC_TESTNET_REGISTRY_ADDRESS` only for matching deployments.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL for spin history, payout management, and indexed analytics
- A BNB Chain wallet

## Setup in WSL Ubuntu

From the Ubuntu terminal, enter the repository (adjust the path if it is elsewhere):

```bash
cd "/mnt/d/NFT-projects/agent legends"
cp -n .env.example .env
npm ci
npx prisma generate
```

Set `DATABASE_URL`, `BSC_CHAIN_ID` (`56` for mainnet or `97` for testnet), and `ADMIN_SESSION_SECRET` in `.env`. Configure the server and public admin wallet allowlists consistently. Never place private keys or server secrets in `NEXT_PUBLIC_*` variables.

For a local development database, apply the schema with:

```bash
npx prisma db push
```

Start the app with:

```bash
npm run dev
```

## Validation commands

Run these commands from the repository root in WSL Ubuntu:

```bash
npx tsc --noEmit
npm run build
npm run test:contracts
```

The repository includes Cloudflare OpenNext scripts (`npm run preview` and `npm run deploy`) for deployments configured with the required Cloudflare and database environment variables.

## Important limitations

- The backend spin engine is centralized: results are auditable in the application database but are not independently verifiable blockchain randomness.
- Initial spin grants are verified from staking events. The app tracks spin spending and free-spin awards in PostgreSQL; it does not call `consumeSpinCredit` for each spin, so the contract's `spinCredits` view reflects grants rather than the app's remaining spendable balance.
- NFT token metadata and wallet ownership history are not enumerated by the deployed NFT contract. A compatible indexer is required for a complete portfolio gallery.
- Spin, payout, and referral analytics stored in PostgreSQL depend on successful transaction synchronization; contract state remains authoritative for on-chain supply, fees, staking, and referral entitlements.
- Test thoroughly on a configured testnet and review payout operations before production use.
