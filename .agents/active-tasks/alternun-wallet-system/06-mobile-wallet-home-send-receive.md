---
name: wallet-mobile-home-send-receive
title: Mobile UI — wallet home, send, receive, activity; replace dashboard placeholder card
priority: high
status: todo
depends_on: [wallet-server-module-api, wallet-crypto-module, wallet-mobile-creation-backup-flow]
---

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
