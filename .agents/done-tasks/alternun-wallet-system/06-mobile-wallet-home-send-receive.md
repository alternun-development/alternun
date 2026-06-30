---
name: wallet-mobile-home-send-receive
title: Mobile UI — wallet home, send, receive, activity; replace dashboard placeholder card
priority: high
status: implemented-pending-live-verification
completed: 2026-06-30
depends_on: [wallet-server-module-api, wallet-crypto-module, wallet-mobile-creation-backup-flow]
---

## 2026-06-30 update: address validation + fee-review step completed

- **Per-chain address validation**: new `isValidChainAddress(address, chain, network)` in `packages/wallet/src/crypto/validateAddress.ts` — uses `viem`'s `isAddress` (EVM checksum), `@scure/btc-signer`'s `Address(network).decode()` (Bitcoin bech32, also catches mainnet-address-on-testnet mismatches), `@solana/web3.js`'s `PublicKey` constructor (Solana). Exported from `@alternun/wallet` (not added as a direct mobile dependency, matching the existing pattern of routing all chain-library usage through the wallet package). 2 new tests added (17/17 passing in `packages/wallet`).
- **Fee-review step**: `WalletSendModal.tsx` now has a `review` stage between the send form and PIN entry — shows asset, recipient, amount, and an estimated network fee (EVM: `gasPrice × 21000`; Bitcoin: `feeRate × estimated vsize`; Solana: "negligible, paid in SOL") before the user confirms with their PIN. Network params are re-fetched at actual signing time (not reused from the review snapshot) since EVM nonce/Bitcoin UTXOs/Solana blockhash can go stale while the user reads the review screen.
- Both verified via `tsc --noEmit` (clean) and a full `expo export --platform web` (clean bundle).

**Still not done (deferred, see `pending-tasks/alternun-wallet-system/`):**

- No QR code rendering in Receive (no QR library installed).
- `DashboardSummaryCards.tsx` wallet panel not wired to real balances (separate placeholder, not blocking).
- No manual QA pass on live testnet/devnet endpoints for the Send flow specifically.

## Implementation status (2026-06-30)

**Done:**

- `GET /v1/wallet/network-params?chain=` endpoint added (`apps/api/.../wallet.controller.ts`, `.service.ts`) —
  exposes per-chain unsigned-tx parameters (EVM nonce/gas price/chainId, Bitcoin UTXOs/fee rate, Solana recent
  blockhash) via the existing `ChainAdapter.getNetworkParams()` (now implemented for all 3 chains).
- Client-side signing added to `packages/wallet` (`src/crypto/sign.ts`): `signEvmTransaction` (via viem's
  `mnemonicToAccount`), `signBitcoinTransaction` (via `@scure/btc-signer`, naive UTXO-sum coin selection + flat
  vsize fee estimate), `signSolanaTransaction` (via `@solana/web3.js`). Covered by 4 new tests in
  `packages/wallet/test/wallet.test.js` (14/14 passing).
- `WalletReceiveModal.tsx`, `WalletSendModal.tsx`, `WalletActivityModal.tsx` built and wired into
  `apps/mobile/app/mi-perfil.tsx`'s `WalletTab` (balances row + Receive/Send/Activity buttons added to the
  existing wallet card). Broadcast goes through `apps/api`'s `/v1/wallet/broadcast` proxy (server never signs —
  this matches the already-built `wallet.service.ts`, a deliberate revision from this doc's older
  "client straight to RPC" note below).
- Mainnet/testnet RPC selection added per stage (`apps/api/src/common/env/network-stage.ts`), so
  `testnet.airs.alternun.co` uses testnet RPCs and `airs.alternun.co` uses mainnet — plus a `TestnetBanner` shown
  in the mobile app shell when running against a testnet/local API.

**Known gaps (not yet done):**

- No QR code rendering in Receive (no QR library installed yet — address is copyable text only).
- No per-chain recipient address format/checksum validation before signing (a malformed address currently fails
  at sign/broadcast time, not before).
- No separate "review with fee estimate" step — Send goes straight from amount entry to PIN confirm; the fee is
  computed but not shown to the user before signing.
- `DashboardSummaryCards.tsx` wallet panel not yet updated to use real balances (still task 06 scope, not started
  this pass).
- No manual QA pass yet on live testnet/devnet endpoints for the Send flow specifically (build/typecheck/unit
  tests validated; balances/activity reads were already live-verified in task 07).

# Task 06 — Wallet home, Send, Receive, Activity

See `00-SPEC.md` §6 steps 4-6.

## Scope

1. **Wallet home screen**: multi-chain balance list (EVM/BTC/SOL), sourced from `/v1/wallet/balances` (task 07
   provides the data; this task just renders it). Replace the hardcoded `0xA8f9...Wq77E4c2` / "Coming soon" ATN
   values in `apps/mobile/components/dashboard/DashboardSummaryCards.tsx` (the wallet panel section reworked in
   this repo's history — see the merged single-card wallet section) with the real primary wallet address and real
   balance once this feature ships; until then leave the existing placeholder as-is (don't half-wire it).
2. **Receive screen**: per-chain QR code + copyable address, no PIN required (read-only data).
3. **Send screen**:
   - Asset/chain picker → recipient address (with basic checksum/format validation per chain) → amount → review
     screen showing estimated network fee → **PIN re-entry** (reuses `PinUnlockScreen` from task 04) →
     `/v1/wallet/verify-pin` → derive KEK client-side → decrypt seed → sign tx with task 03's per-chain signer →
     broadcast directly to the chain RPC (task 07) → clear decrypted key from memory immediately → show
     confirmation with explorer link.
   - No server endpoint ever sees the decrypted seed or the signed transaction's private inputs — only the already
     -signed, broadcast-ready transaction touches the network, and it goes straight from client to RPC, not through
     `apps/api`.
4. **Activity tab**: tx history per chain via `/v1/wallet/activity` (task 07).

## Acceptance criteria

- [ ] Decrypted key/seed exists in memory only for the duration of signing a single transaction, explicitly
      zeroed/dereferenced immediately after (audit for accidental closures holding a reference longer than needed).
- [ ] Recipient address validation rejects malformed addresses per-chain before allowing "Review" (wrong-chain
      address format is a common, fund-losing mistake — checksum validation is not optional).
- [ ] Network fee estimate shown before signing, not just at broadcast time.
- [ ] Works across light/dark theme and the existing compact/dense mobile breakpoints used elsewhere in
      `DashboardSummaryCards.tsx` (`isCompactMobile`/`isDenseAtnCard` pattern).
- [ ] Manual QA on at least one testnet per chain (Sepolia for EVM, Solana devnet, Bitcoin testnet) before any
      mainnet exposure.
