export const CONTRACT_ADDRESSES = {
  56: {
    shareMint: "0x0E918a36bEcAF6dF057bf206C5642D50045BBF35",
    token: "0x66E0964A2b7a52C2d68A3a19f4d981B0e5381120",
    nft: "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
  },
  97: {
    shareMint: "0x0E918a36bEcAF6dF057bf206C5642D50045BBF35",
    token: "0x66E0964A2b7a52C2d68A3a19f4d981B0e5381120",
    nft: "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912",
    usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
  },
} as const;

export const DEFAULT_CHAIN_ID = 56;

// Share Mint Parameters
export const MAX_SHARES = 100000;
export const PANCAKE_LAUNCH_THRESHOLD = 10000;
export const TOKENS_PER_SHARE = 4500;
export const START_SHARE_PRICE_USDT = 0.5;
export const SHARE_PRICE_INCREMENT = 0.0001;

// NFT Parameters
export const MAX_SUPPLY = 2000;
export const MAX_FREE_SUPPLY = 1000;
export const MAX_PER_WALLET = 10;
export const MAX_PAID_PER_WALLET = 9;
export const PAID_PRICE_BNB = "0.0005";
export const PAID_PRICE_WEI = 500000000000000n; // 0.0005 BNB

export function getContractConfig(chainId: number) {
  if (chainId === 56 || chainId === 97) {
    return CONTRACT_ADDRESSES[chainId];
  }

  return CONTRACT_ADDRESSES[56];
}
