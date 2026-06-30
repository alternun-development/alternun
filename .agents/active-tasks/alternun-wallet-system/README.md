# Alternun Wallet System — task index

**Priority: HIGH.** Non-custodial, multi-chain (EVM + Solana + Bitcoin) internal wallet, PIN-encrypted private key,
started from the "Mi perfil → Billetera" screen. Full design rationale lives in `00-SPEC.md` — read that first.

**Rev. 2 (2026-06-29):** discovered `packages/wallet` already implements most of the crypto primitives (unwired,
phase-1 scaffold). Product decision: device-only recovery, no server-side seed backup, no AWS KMS needed. See
`00-SPEC.md`'s revision note for the full diff from rev. 1.

| #   | Task                                                                                                 | Depends on        | Status                                                                      |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| 00  | [SPEC](./00-SPEC.md) — architecture, crypto design, data model, API surface, UI flow                 | —                 | rev. 2                                                                      |
| 01  | [DB schema migration](./01-db-schema-migration.md)                                                   | —                 | **done**                                                                    |
| 02  | [Server wallet module API](./02-server-wallet-module-api.md)                                         | 01                | **implemented** (balances/activity/broadcast deferred to 07)                |
| 03  | [Finish `packages/wallet`](./03-crypto-key-derivation-module.md)                                     | —                 | **build-validated** (3 runtime bugs caught+fixed: WASM/Buffer/quick-crypto) |
| 04  | [Mobile PIN setup/unlock flow](./04-mobile-pin-setup-flow.md)                                        | 02, 03            | **implemented + i18n complete**                                             |
| 05  | [Mobile wallet creation/backup/export flow](./05-mobile-wallet-creation-backup-flow.md)              | 03, 04            | **implemented + WalletTab UI redesigned**                                   |
| 06  | [Mobile wallet home/send/receive](./06-mobile-wallet-home-send-receive.md)                           | 02, 03, 05        | todo — needs task 07's RPC provider decision first                          |
| 07  | [Multi-chain RPC integration](./07-multichain-rpc-integration.md)                                    | 02                | todo                                                                        |
| 08  | [Rate limiting & security hardening](./08-rate-limiting-security-hardening.md)                       | 02                | **lockout done in 02**, throttling/audit remaining                          |
| 09  | [Testing & QA plan](./09-testing-qa-plan.md)                                                         | — (cross-cutting) | todo                                                                        |
| 99  | [Future: server-side backup upgrade](./99-future-server-backup-upgrade.md) (archived, not scheduled) | —                 | archived                                                                    |

## Suggested parallelization

- **Track A (crypto, no DB needed):** 03 → 04 → 05 → 06
- **Track B (infra/backend):** 01 → 02 → 07, 08
- Tracks merge at 04 (needs 02+03) and again at 06 (needs 02+03+05).
- 09 runs alongside every task, not as a final phase.

## Non-negotiables (see SPEC §2)

1. Plaintext seed/key never leaves the device.
2. The server never has any information that could decrypt a wallet — it only ever holds a PIN _verifier_
   (`pin_hash`/`pin_salt`), never the encryption key itself or the seed.
3. Server-side PIN re-verification (for Send/Export) is rate-limited/lockable per-user (4-digit PIN ⇒ only 10,000
   combinations) — this defends the "found/stolen unlocked phone" scenario, not offline Keychain extraction.
4. No server-side seed backup, no AWS KMS — device-only recovery model, stated plainly in the UI, not implied.
5. `/security-review` runs on this module before any real-user exposure, and again before feature-flag removal.
