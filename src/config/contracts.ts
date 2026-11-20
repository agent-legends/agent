export const CONTRACT_ADDRESSES = {
  56: {
    nft: "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912",
    staking: "",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
  },
  97: {
    nft: process.env.NEXT_PUBLIC_TESTNET_NFT_ADDRESS || "0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912",
    staking: "",
    registry: process.env.NEXT_PUBLIC_TESTNET_REGISTRY_ADDRESS || "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
  },
} as const;

export const DEFAULT_CHAIN_ID = 56;
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

  return null;
}
