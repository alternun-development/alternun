---
name: wallet-external-linking
title: Link an externally-owned wallet (MetaMask etc.) with signature-verified ownership proof
priority: medium
status: todo
depends_on: [wallet-multi-wallet-restore-default-account]
---

# Task 12 — External wallet linking

Split out from task 11 (2026-06-30) — multi-wallet/default-account support and device-change recovery for
Alternun-managed wallets are done; linking an _externally-owned_ wallet (MetaMask, Phantom, etc.) as an additional
or default account is a separate, larger piece of work, deferred here.

## Why this can't just be "paste an address"

`wallet_accounts.wallet_type` already allows `'external'` and `WalletAccountDto`/`insertWalletAccount` already
accept it (see task 11, point 4) — but accepting an arbitrary externally-supplied address with no proof of
ownership is not safe to use for reward payouts: anyone could paste anyone else's public address and claim it as
their own default account. This needs an actual ownership proof before it's trustworthy.

## Scope

1. **Challenge/sign/verify flow**: server issues a one-time challenge string for the user's session, the user
   signs it with their external wallet (via WalletConnect/wagmi or a browser-injected provider like
   `window.ethereum`), the signature is verified server-side (`viem`'s signature recovery — recover the address
   from the signature and challenge, compare to the claimed address) before the account is inserted/trusted.
2. **Client SDK integration**: this app already has `w3m-modal` (WalletConnect/Web3Modal) bundled per the build
   output — check whether it's already wired up elsewhere (e.g. an existing sign-in path) before adding a new
   integration; reuse rather than duplicate if so.
3. **Mobile UI**: "Connect external wallet" entry point (the button this replaced with "Restore from recovery
   phrase" in task 11 needs its own home now — could be a new button alongside it, or inside `WalletManageModal`
   as an "Add wallet" action).
4. Only EVM is realistic for a first pass (WalletConnect/wagmi's signature flow is EVM-native); Bitcoin/Solana
   external linking would need separate, chain-specific proof mechanisms — scope this task to EVM only unless
   there's a concrete near-term need for the others.

## Acceptance criteria

- [ ] An externally-linked account cannot be inserted without a verified signature proving the user controls the
      private key for the claimed address.
- [ ] The challenge is single-use and expires (no replay).
- [ ] External accounts behave correctly as a default/primary selection in `WalletManageModal` (already built in
      task 11 — `walletType`/`isPrimary` are generic, this should need no changes there).
- [ ] `/security-review` on the challenge/verify flow before any real-user exposure — signature verification bugs
      are a classic source of account-takeover vulnerabilities.
