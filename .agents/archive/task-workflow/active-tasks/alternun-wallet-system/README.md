# Alternun Wallet System — task index

> Archived workflow index. The canonical task files now live in [`.specs/tasks/`](../../../../../.specs/README.md); this file is retained as migration context only.

**Priority: HIGH.** Non-custodial, multi-chain (EVM + Solana + Bitcoin) internal wallet, PIN-encrypted private key,
started from the "Mi perfil → Billetera" screen. Full design rationale lives in [the canonical wallet specification](../../../../../.specs/tasks/in-progress/alternun-wallet-system-spec.feature.md).

**Rev. 2 (2026-06-29):** discovered `packages/wallet` already implements most of the crypto primitives (unwired,
phase-1 scaffold). Product decision: device-only recovery, no server-side seed backup, no AWS KMS needed. See
the canonical specification's revision note for the full diff from rev. 1.

**Archived tasks:** 01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 13, 14, 99, SEC-02, SEC-04, TECH-01

| #   | Task                                                                                                                                                   | Depends on        | Status                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------- |
| 00  | [SPEC](../../../../../.specs/tasks/in-progress/alternun-wallet-system-spec.feature.md) — architecture, crypto design, data model, API surface, UI flow | —                 | **in-progress**                                                      |
| 09  | [Testing & QA plan](../../../../../.specs/tasks/in-progress/alternun-wallet-system-testing-qa.feature.md)                                              | — (cross-cutting) | **in-progress** — most integration verified; real-device QA deferred |
| 12  | [External wallet linking (signature-verified)](../../../../../.specs/tasks/todo/alternun-wallet-system-external-wallet-linking.feature.md)             | 11                | todo — WalletConnect + ownership proof (deferred past 1.1.0)         |

**2026-06-30: web is the current development priority, native is deferred.** Native-device QA (the blocking item
in the canonical QA plan's manual QA matrix) is not required to keep making progress — task 13 (web security
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
