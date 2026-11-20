# Agent Legends

Agent Legends is a Next.js dApp for the Agent Legends NFT collection on BNB Smart Chain. It provides wallet-based free minting for verified Binance Agent ID holders, accessible paid minting, community referrals, and collection tracking.

## Verified BNB Smart Chain Contracts

The mainnet contract addresses are configured in `src/config/contracts.ts`:

| Contract | BNB Smart Chain Address |
|---|---|
| Agent Legends NFT | `0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912` |
| Binance Agent ID Registry | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |

Important integration details:

- **Total Supply:** Strictly capped at 2,000 NFTs on BNB Smart Chain (`MAX_SUPPLY = 2000`).
- **Free Agent Mint:** 1 Free NFT for holders of Binance Agent ID via `claimFreeNFT()`. Up to 1,000 free NFTs reserved (`MAX_FREE_SUPPLY = 1000`).
- **Paid Mint:** 0.0005 BNB per NFT via `mintPaid(quantity)`, allowing up to 9 paid mints per wallet (`MAX_PER_WALLET = 10`).
- **Social / Community:** Official updates and announcements at [https://x.com/agent_legends](https://x.com/agent_legends).

## Requirements

- Node.js 20 or newer
- npm
- Cloudflare D1 / SQLite database
- A BNB Chain Web3 wallet

## Setup

```bash
cp -n .env.example .env
npm install
npx prisma generate
```

Start the application with:

```bash
npm run dev
```

## Production Build & Deploy

```bash
npx opennextjs-cloudflare build
npx wrangler deploy
```
