# Alternun Wallet System — task index

**Priority: HIGH.** Non-custodial, multi-chain (EVM + Solana + Bitcoin) internal wallet, PIN-encrypted private key,
started from the "Mi perfil → Billetera" screen. Full design rationale lives in `00-SPEC.md` — read that first.

**Rev. 2 (2026-06-29):** discovered `packages/wallet` already implements most of the crypto primitives (unwired,
phase-1 scaffold). Product decision: device-only recovery, no server-side seed backup, no AWS KMS needed. See
`00-SPEC.md`'s revision note for the full diff from rev. 1.

**Archived tasks (moved to `done-tasks/alternun-wallet-system/`):** 01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 13, 14, 99, SEC-02, SEC-04, TECH-01

| #   | Task                                                                                 | Depends on        | Status                                                               |
| --- | ------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------- |
| 00  | [SPEC](./00-SPEC.md) — architecture, crypto design, data model, API surface, UI flow | —                 | rev. 2 (reference doc)                                               |
| 09  | [Testing & QA plan](./09-testing-qa-plan.md)                                         | — (cross-cutting) | **in-progress** — most integration verified; real-device QA deferred |
| 12  | [External wallet linking (signature-verified)](./12-external-wallet-linking.md)      | 11                | todo — WalletConnect + ownership proof (deferred past 1.1.0)         |

**2026-06-30: web is the current development priority, native is deferred.** Native-device QA (the blocking item
in `09-testing-qa-plan.md`'s manual QA matrix) is not required to keep making progress — task 13 (web security
review) takes its place as the current security-focused priority.

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
