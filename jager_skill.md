---
name: jagent
description: |
  Use when the user wants to do anything on jager.live / $JAGENT with their Binance Agentic Wallet:
  sign in the wallet, check $JAGENT status, mint quota, price, mint $JAGENT with USDT or BNB,
  mint with an inviter / referrer (.ai name), get my invite link, check or claim invite rewards,
  social tasks (follow X, tweet, join Telegram) for extra mint quota, bind or unbind X account,
  claim the Super Ambassador card, Fishing S2 (sign in, cast, fish points, casts left, fishing leaderboard),
  S1 clearance card (vault, equip card), leaderboards, Mint Pass, border level.
  ????:?? / mint JAGENT???????????????????????? X??? X??????
  ?????????????????????????Mint Pass??????
license: MIT
metadata:
  author: jager.live
  version: '1.1.2'
  homepage: https://jager.live
  requires:
    skills:
      - binance-agentic-wallet
  openclaw:
    requires:
      bins:
        - baw
        - curl
    install:
      - kind: node
        package: '@binance/agentic-wallet'
        bins: [baw]
        label: Install Binance Agentic Wallet CLI (npm)
---

# $JAGENT on jager.live

This skill lets the user run every jager.live action from their Binance Agentic Wallet through the `baw` CLI: sign in, mint $JAGENT, claim invite rewards, social tasks, X binding, the Super Ambassador card and Fishing S2.

It builds on the official `binance-agentic-wallet` skill (https://github.com/binance/binance-skills-hub). Follow that skill's rules for every `baw` command. This skill only adds the jager.live endpoints and the order of steps.

Reply in the user's language. For Chinese error messages from the API, send the header `Cookie: jg_locale=zh`.

## Facts (BNB Smart Chain, `--binanceChainId 56`)

| What | Address |
|---|---|
| $JAGENT mint contract (the only contract that takes payment) | `0x3643A907f875fA9B740e1C0747E91b5aA5222aB8` |
| $JAGENT token (18 decimals; for display only) | `0x8e6442663A4F8C50b6132c68d42A30E7DFE4Ae15` |
| USDT (BEP-20) | `0x55d398326f99059fF775485246999027B3197955` |

- The token is **$JAGENT**. It replaced $JAGER. Any guide that says "mint $JAGER" is outdated.
- Only a wallet that holds a `.ai` Agent ID can mint. Each Agent ID gets 10 shares of quota, plus 1 per qualified invite and 1 per social task. Max 10 shares per transaction.
- Live numbers (price, shares minted, BNB quotes): `GET https://jager.live/api/stats` or `https://jager.live/llms.txt`.

## Safety rules (always)

1. Only send transactions whose `to` is the mint contract or USDT (for `approve` to the mint contract). Use the exact `to`, `value` and `data` the jager.live API returns. Never edit calldata.
2. **Never** transfer BNB or USDT directly to any address for $JAGENT. A plain transfer does not mint and is lost. Never use the retired $JAGER contracts `0x2239f7C884833e181302501B22f5D5265520BFd7` / `0x2435ec780262f1ab1b087A97EE8fF726d7D09928`.
3. Every transaction and signature goes `preview` ? show the user ? explicit "yes" ? `execute`. If preview returns risks, show them first. If preview fails, stop and report; do not execute.
4. Signatures here are EIP-712 login proofs for jager.live only. They move no funds and grant no approval. Still show the `statement` to the user before signing.
5. Never ask for or handle private keys, seed phrases or the Binance pairing code beyond showing it to the user.
6. Do not promise returns or prices. Rewards are paid by the jager.live rules and can be paused.

## Step 0: wallet ready

1. `baw wallet status --json`. If not connected, sign in (below).
2. Get the BSC address: `baw wallet address --json` ? the entry with `binanceChainId` `56`. Call it `<wallet>` below.
3. `baw wallet agent-id --json`. If `claimed` is false, the user cannot mint; tell them to claim a `.ai` Agent ID in the Binance App (Web3 wallet ? Agent ID) first.
4. Before any transaction or signature, `baw wallet settings --json` must show `devMode.enabled: true` with `expiresAt` in the future. If not, tell the user: Binance App ? Agentic Wallet ? Settings (top right) ? turn on **Developer Mode** ? confirm the risk warning ? approve. It lasts 7 days. The wallet balance must be under the Developer Mode cap.

### Sign in (????)

1. `baw auth signin --json`. Show the `pairingCode` verbatim and open `urlForWeb` verbatim (also print it as a link).
2. The user scans the QR with the Binance App, checks the pairing code matches, and confirms.
3. `baw auth verify --qrCodeId <qrCodeId> --json` (blocks up to 5 minutes). If the code expired, start again from `auth signin`.
4. Confirm with `baw wallet status --json`.

Sign out: `baw auth signout --json`.

## Status (?? / ?? / ??)

```bash
curl -s "https://jager.live/api/agent/status?address=<wallet>"
```

Returns `agentId`, `balances` (BNB, USDT, JAGENT), `mint` (price, `minted`, `quota`, `remaining`), `socialTasks` (open / claimed), `invite` (link, border, invited, `pendingUsdt`, `paidUsdt`), `ambassador`, `boss` (S1 result: damage, rank, clearance card, payout), `vault` and `x` (bound X handle). Summarise in plain words.

Always pass the wallet address. A `.ai` name lookup returns `balances: null`, `pendingUsdt` / `paidUsdt` / `payout` as null, and a `note`; it is not a way to look into someone else's wallet.

## Mint $JAGENT (??)

1. Ask how many shares (1-10, at most `mint.remaining`) and pay with USDT or BNB. If the user has an inviter, take their `.ai` name (for example `alice.ai`) or address. A referral link `https://jager.live/?ref=alice.ai` means the referrer is `alice.ai`.
   - On a new user's first mint, tell them the invite reward (for them and their referrer) only counts with **10 shares in one transaction**; smaller mints that add up to 10 earn nothing. Suggest 10 shares, but mint what the user chooses.
2. Build the transactions:

   ```bash
   curl -s "https://jager.live/api/agent/mint-tx?address=<wallet>&shares=<1-10>&pay=usdt|bnb&ref=<alice.ai>"
   ```

   Omit `ref` when there is none. The API checks the Agent ID, quota, balance and referrer, and returns `steps` in order. USDT may need an `approve` step first. On an error, show the `error` text and stop.
3. Tell the user the cost (`costUsdt`, plus `sendBnb` for BNB) and referrer, then for each step in order:

   ```bash
   baw contract-call preview --binanceChainId 56 --from <wallet> --to <step.to> --value <step.value> --inputData <step.data> --json
   ```

   (`step.baw` is this exact command.) Show `parsedTx`, `simulationResult.balanceChanges` and `risks`. After the user confirms: `baw contract-call execute --requestId <requestId> --json`.
   - `BROADCASTED` ? show `txHash` as `https://bscscan.com/tx/<txHash>`. Wait for the approve to confirm (`baw wallet tx-history --tx <txHash> --json`) before previewing the mint.
   - `PENDING_CONFIRMATION` ? ask the user to approve in the Binance App.
4. Confirm with the status call that `mint.minted` went up.

For BNB the contract charges the live quote and refunds any extra BNB in the same transaction.

## Invite rewards (????)

- Invite link: `invite.link` from status (`https://jager.live/?ref=<handle>.ai`).
- Rule: a new user who first mints from 2026-11-15 16:30 (UTC+8) on counts only with a single mint of 10 shares (one transaction). Smaller mints that add up to 10 earn nothing, for them or the referrer.
- Details and current amounts: `curl -s "https://jager.live/api/invite-rewards?address=<wallet>"` (`rewardsUsdt`, `targetInviterUsdt` by border, `you.pending`, `you.paid`, `you.invitees`; in each invitee `reached` means it counted, `split` means it got to 10 shares only over several mints and earns nothing unless it mints 10 in one go).
- Claim pending USDT (no signature needed; it can only pay this wallet):

  ```bash
  curl -s -X POST https://jager.live/api/invite-rewards -H "content-type: application/json" -d '{"address":"<wallet>"}'
  ```

  `{"ok":true,"paid":"1.5","hash":"0x…"}` means paid. `reason` values: `nothing` (nothing pending), `too-soon` (wait 30 s), `busy` / `pending` (retry in a minute), `network` (BSC node busy; rewards stay owed, retry shortly), `paused` (payouts paused; rewards stay owed), `not-started`. Rewards are also paid automatically every hour.

## Social tasks (+1 quota each)

Tasks: `FOLLOW` (follow https://x.com/jagerbnb_), `TWEET` (a public post about $JAGENT, or a repost of @jagerbnb_), `TELEGRAM` (join https://t.me/jageraiMINT). Ask the user to do the task first.

```bash
curl -s -X POST https://jager.live/api/social -H "content-type: application/json" -d '{"address":"<wallet>","task":"TWEET","tweetUrl":"https://x.com/<user>/status/<id>"}'
```

(`tweetUrl` only for `TWEET`.) The response has a `tx` ready to send: preview and execute it like a mint step. The voucher expires in 15 minutes.

## Signed actions: X binding, Super Ambassador, Fishing sign-in

These need a jager.live login proof signed with EIP-712. Valid for 10 minutes; get a fresh one each time.

1. Get the request (`action` = `bind`, `unbind`, `ambassador` or `game`):

   ```bash
   curl -s "https://jager.live/api/agent/proof?address=<wallet>&action=<action>" > proof.json
   ```

2. Show the user `statement`. Then sign `signMessage.message` exactly as returned. Read it from the file so the shell does not break the JSON quoting:

   ```bash
   MSG=$(node -e "console.log(require('./proof.json').signMessage.message)")
   baw sign-message preview --binanceChainId 56 --signType EIP712 --message "$MSG" --json
   baw sign-message execute --requestId <requestId> --json
   ```

   If `PENDING_CONFIRMATION`, ask the user to approve in the Binance App, then `baw sign-message result --order-id <orderId> --json`.
3. Submit `submit.body` to `submit.url` with `proof.signature` = `signature` and `proof.recovery` = `signatureRecovery` from baw (`time` unchanged).

### Bind / unbind X (?? X)

1. The user posts a public X post that contains their `.ai` Agent ID (for example `alice.ai`). Ask for the post link.
2. Proof with `action=bind`, then:

   ```bash
   curl -s -X POST https://jager.live/api/x-bind -H "content-type: application/json" \
     -d '{"action":"bind","address":"<wallet>","tweetUrl":"<post link>","proof":{"kind":"eip712","time":"<time>","signature":"<signature>","recovery":"<signatureRecovery>"}}'
   ```

3. Unbind: proof with `action=unbind`, same call with `"action":"unbind"` and no `tweetUrl`. After unbinding, that Agent ID and X account wait 7 days before binding again.
4. Check: `curl -s "https://jager.live/api/x-bind?handle=<handle>"`.

### Super Ambassador card (????)

Board and eligibility: `curl -s "https://jager.live/api/ambassador?address=<wallet>"` (`you.claimable`). If claimable, proof with `action=ambassador`, then POST `{"address":"<wallet>","proof":{…}}` to `https://jager.live/api/ambassador`. Returns `{handle, card}`.

## Fishing S2 (???)

Mon 2026-11-16 08:00 to Mon 2026-11-23 08:00 (UTC+8). Full guide: https://jager.live/fish-skill.md

- Each share minted during the event gives one cast; earlier mints do not count. Cast sizes 1 / 5 / 10 / 50 / 100.
- Status: `curl -s "https://jager.live/api/fish/status?address=<wallet>"`. Board: `curl -s "https://jager.live/api/fish/leaderboard?limit=100"`.
- Sign in: proof with `action=game`, then POST `{"address":"<wallet>","proof":{…}}` to `https://jager.live/api/game/session`. Keep the returned `token` (valid 24 hours) private and send it as `Authorization: Bearer <token>`. Sign out: `curl -s -X DELETE https://jager.live/api/game/session -H "Authorization: Bearer <token>"`.
- Cast with the token:

  ```bash
  curl -s -X POST https://jager.live/api/fish/cast -H "Authorization: Bearer <token>" -H "content-type: application/json" \
    -d '{"casts":10,"requestId":"<new random id>"}'
  ```

  Always open the returned `resultUrl` so the user sees the animation. ?? Xuan Fish adds 1 USDT to the invite-reward balance.
- The top 100 split 10,000 USDT after the event if the wallet still holds at least 50% of the $JAGENT it minted during the event.

## S1 Boss game (ended)

S1 ran from 2026-11-03 to 2026-11-10 and is settled; there are no more attacks. The top 1,000 by damage hold the "Neuralis Clearance" card. With the fishing sign-in token: vault `GET https://jager.live/api/game/vault`, equip with POST `{"equip":"clearance"}` or `{"equip":"base"}` to the same URL. Final damage board: `curl -s "https://jager.live/api/game/leaderboard?limit=100"`.

## Leaderboards and Mint Pass

- Invites / mints / holders, day and week: `curl -s https://jager.live/api/leaderboard`
- Mint Pass and border: `curl -s "https://jager.live/api/pass?handle=<handle>"`
- Check any wallet or name: `https://jager.live/api/verify?address=<wallet>` or `?address=<wallet>&name=<handle>`

## Errors

- API errors come back as `{"error":"…"}`. Show the text; do not retry signed or paid actions blindly.
- `351802` from baw: Developer Mode expired, so turn it on again. `351804`: wallet balance is above the Developer Mode cap. `351805`: simulation failed, so re-run `mint-tx` (the price may have moved) and preview again.
- If mint preview fails with `Quota`, `NoAgent`, `Paused` or `StalePrice`, run status and explain; for `StalePrice` pay with USDT instead.

