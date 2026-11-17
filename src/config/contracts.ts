export const CONTRACT_ADDRESSES = {
  56: {
    nft: "0x3d8b78084BF69936AF661DD33C6F95f345E93702",
    staking: "0x7eaE685c150D655fA1bA419cCB6956816641a9f4",
    registry: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
  },
  97: {
    nft: process.env.NEXT_PUBLIC_TESTNET_NFT_ADDRESS || "",
    staking: process.env.NEXT_PUBLIC_TESTNET_STAKING_ADDRESS || "",
    registry: process.env.NEXT_PUBLIC_TESTNET_REGISTRY_ADDRESS || "",
    usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    usdtDecimals: 18,
    rpcUrl: process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
    explorer: "https://testnet.bscscan.com",
  },
} as const;

export const DEFAULT_CHAIN_ID = 56;

export function getContractConfig(chainId: number) {
  if (chainId === 56 || chainId === 97) {
    return CONTRACT_ADDRESSES[chainId];
  }

  return null;
}
