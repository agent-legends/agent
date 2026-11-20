# Agent Legends Skill for Binance Agentic Wallet (`baw`)

Website: https://agent.agentlegends.workers.dev · Machine-readable guide: https://agent.agentlegends.workers.dev/llms.txt

**Agent Legends ($LEGENDS)** is the premier autonomous Web3 agent identity and bonding curve protocol on BNB Smart Chain (Chain ID: 56).

## Verified Contracts (BNB Smart Chain Mainnet — Chain ID: 56)

- **LegendsShareMint Contract:** `0x0E918a36bEcAF6dF057bf206C5642D50045BBF35`
  (The only authorized contract for minting bonding curve shares, referral rewards, and PancakeSwap LP launch)
- **$LEGENDS Token (BEP-20):** `0x66E0964A2b7a52C2d68A3a19f4d981B0e5381120` (18 decimals)
- **Agent Legends NFT (ERC-721):** `0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912` (2,000 Hard Supply Cap)
- **BSC-USD / USDT (BEP-20):** `0x55d398326f99059fF775485246999027B3197955` (18 decimals)

---

## Bonding Curve Shares ($LEGENDS)

- **Total Shares:** 100,000 Shares Cap
- **Tokens Per Share:** 4,500 $LEGENDS per share
- **Starting Price:** $0.50 USDT per share (rises +0.0001 USDT per share minted)
- **PancakeSwap V2 Pool Launch:** Automatically triggers when 10,000 shares are minted (100% of accumulated USDT + 45,000,000 $LEGENDS deposited into LP).
- **Referral Cashback:** 5% instant USDT cashback for referred buyers.
- **Referral Commission:** 10% standard rate, or **15% Super Ambassador rate** for holders of 1+ Agent Legends NFT.

### Minting with USDT (2-Step EVM Calls):
1. **Approve USDT:**
   `approve(spender: 0x0E918a36bEcAF6dF057bf206C5642D50045BBF35, amount: costWei * 101 / 100)`
2. **Buy Shares:**
   `buyShares(quantity: uint256, referrer: address, maxUSDTIn: uint256)`
   *(Pass `0x0000000000000000000000000000000000000000` if no referrer)*

---

## Agent Legends NFT Recruitment

- **Total Supply:** 2,000 NFTs strictly capped.
- **1 Free Claim:** First 1,000 NFTs reserved for verified Binance SPACE ID Agent ID (`.ai`) holders.
  Call `claimFreeNFT()` (0 BNB + gas).
- **Public Paid Mint:** 0.0005 BNB per NFT via `mintPaid(quantity)`. Max 10 total NFTs per wallet.
- **Super Ambassador Perk:** Holding 1+ Agent Legends NFT unlocks the 15% boosted USDT referral commission on all share mints.

---

## Natural Language AI Agent Prompt

```
Interact with Agent Legends on BNB Smart Chain (Chain ID: 56):
1. For Shares: Call calculateMintCost(quantity) on LegendsShareMint 0x0E918a36bEcAF6dF057bf206C5642D50045BBF35, approve USDT 0x55d398326f99059fF775485246999027B3197955, and execute buyShares(quantity, referrer, maxUSDTIn) with 1% slippage buffer.
2. For NFTs: Call isAgenticWalletUser(myAddress) on NFT contract 0x5690B34dA3eFc5d55511c37A0Ad4988CACE8d912. If eligible and not claimed, call claimFreeNFT() (0 BNB). Otherwise, call mintPaid(quantity) at 0.0005 BNB/NFT up to 10 per wallet.
```
