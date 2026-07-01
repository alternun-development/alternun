---
name: wallet-testing-qa-plan
title: Cross-cutting test plan — unit, integration, security, manual QA matrix
priority: high
status: in-progress — web verified, native deferred
depends_on: []
---

# Task 09 — Testing & QA plan

Cross-cutting — write the relevant slice of this alongside each task above as it's built, rather than treating
testing as a final phase. This file tracks the full matrix so nothing is missed.

## Unit tests

- [x] Task 03 crypto module: KAT-based tests per chain derivation (EVM against a widely-published external
      reference; Bitcoin/Solana as honestly-labeled regressions), PBKDF2/AES-GCM vault round-trips, keystore
      export/import round-trip, plus 4 new signing tests (EVM/Bitcoin/Solana tx signing). 14/14 passing
      (`packages/wallet/test/wallet.test.js`).
- [ ] Task 02 service layer: mocked-repository tests for setup/accounts/verify-pin (success, wrong PIN, locked-out,
      server-error paths) — **not done**. This codebase has no DI/module-mocking test infrastructure set up yet
      (no Jest, no `mock.module` wiring for the `node:test` runner used here); adding it is a real but separate
      piece of work from writing the tests themselves. Cross-implementation fixture test (same PIN+salt produces
      identical digest from both `packages/wallet` and the server) **is done** —
      `apps/api/test/wallet-pin.test.js`.
- [ ] Task 08 lockout logic: backoff calculation, reset-on-success — covered indirectly by the pin-digest fixture
      tests, but the actual `resolveBackoffMinutes`/lockout state machine in `wallet.service.ts` has no dedicated
      unit test. Concurrent-attempt race condition not tested or analyzed.
- [x] Task 11 chain adapters (`getNetworkParams` for EVM/Bitcoin/Solana): 9 mocked-fetch tests, all passing
      (`apps/api/test/wallet-chain-adapters.test.js`).

## Integration tests

- [x] **Restore + set-primary-account, live-DB-verified** (2026-06-30): ran the actual repository functions
      (`upsertWalletPreferences`, `upsertPrimaryWalletAccount`, `setPrimaryWalletAccount`) directly against the
      dev Supabase instance — insert path, update-existing-row path, and primary-switch path all confirmed
      correct (exactly one `is_primary = true` row after switching). Not committed as an automated test (would
      need real dev DB credentials in CI); done as a one-off verification pass, documented in
      `11-multi-wallet-restore-and-default-account.md`.
- [x] **Wallet table FK fix, live-DB-verified** (2026-06-30): confirmed the `wallet_accounts`/`wallet_preferences`
      FK now correctly references `public.users(id)` (not `auth.users(id)`) by inserting and deleting a real row
      with a real `public.users.id` — see `01-db-schema-migration.md`'s 2026-06-30 update.
- [x] **IP/global throttling, live-verified** (2026-06-30): ran the actual API server, hit `/wallet/verify-pin` 13
      times in a row (10 pass, 11-13 return 429), hit `/wallet/balances` 12 times (all pass, confirming the
      looser module-wide limit applies there) — see `08-rate-limiting-security-hardening.md`.
- [x] **Logging/redaction, empirically verified** (2026-06-30): sent requests with marker secret values in
      `pin`/`pinSalt`/`pinHash`, grepped full captured server output — no leak. See
      `08-rate-limiting-security-hardening.md`.
- [x] **Full client-side flow, browser-verified** (2026-06-30): generate mnemonic → derive wallet → store with PIN
      → unlock → export/import keystore → sign EVM/Solana tx, run end-to-end in a real headless Chromium browser
      with `typeof Buffer === 'undefined'` (catches the exact class of bug `tsc`/Metro bundling stays silent on).
      See `03-crypto-key-derivation-module.md`'s 2026-06-30 update.
- [ ] Full setup → verify-pin (success and lockout paths) round trip — not run as an automated/scripted
      integration test, though the underlying pieces (setup's repository calls, verify-pin's lockout logic) have
      each been exercised individually as above.
- [ ] RLS: confirm a second user's session cannot read/write the first user's `wallet_accounts`/`wallet_preferences`
      rows. **Re-flagged as needed after the 2026-06-30 FK fix** — the original RLS policies
      (`auth.uid() = user_id`) were dropped as part of that fix since they no longer made sense against a
      `public.users` FK target (see `01-db-schema-migration.md`). Ownership is currently enforced only at the
      application layer (every repository query filters by the `resolveUserId()`-derived userId). This should be
      explicitly re-tested/re-designed, not assumed safe by the application-layer enforcement alone.

## Security review checklist (run `/security-review`, then manually confirm each of these)

- [x] No plaintext seed/key/PIN anywhere server-side, in logs, in error responses — empirically verified
      2026-06-30 (see Integration tests above). The server genuinely never receives a mnemonic, private key, or
      PIN-derived encryption key — confirmed by reading every wallet API request/response shape, not just trusting
      the design doc.
- [ ] Brute-force math, stated honestly for the actual threat model (`00-SPEC.md` §3.1) — not yet computed/written
      up.
- [ ] Confirm `expo-secure-store` is actually backed by the platform Keychain/Keystore on native (not falling back
      to plain storage on some platform/Expo-Go combination) — **the equivalent web-platform question was
      answered this session** (web has no Keychain equivalent at all; `expo-secure-store`'s `isAvailableAsync()`
      correctly detects this and the code falls back to `localStorage`, storing only the already-encrypted vault,
      verified against the real package in a real browser — see `03-crypto-key-derivation-module.md`). The native
      iOS/Android Keychain/Keystore-backing question itself is still unverified on a real device.

## Manual QA matrix (mobile)

**Re-prioritized 2026-06-30: web is the current focus, native is not priority right now.** The blocking item below
(real device/simulator testing) is deferred until native work resumes — don't block web progress on it. Web's
equivalent gap (the `react-native-quick-crypto` web no-op path, `expo-secure-store` web fallback) **has** been
verified this session via real headless-browser runs — see `03-crypto-key-derivation-module.md`. See
`13-web-security-review.md` for the web-specific security audit that replaces native-device QA as the current
priority.

**Native, deferred**: `react-native-quick-crypto` (task 03) was wired but never run on a real device or simulator.
Run `expo prebuild` + a real iOS/Android build and confirm `generateMnemonic()`/`storeMnemonic()`/
`unlockMnemonic()`/`exportMnemonicKeystore()` all work without throwing before testing anything in the table below
on native — every native row depends on this. Not blocking for web.

| Scenario                                                                                       | Platform      | Expected                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh install → create wallet → reinstall **without** export                                   | iOS + Android | Wallet genuinely unrecoverable (device-only model, §1 — confirm this is true, not an accidental bug)                                    |
| Fresh install → create wallet → export keystore → reinstall → import keystore                  | iOS + Android | Same addresses restored from the export                                                                                                 |
| Wrong PIN x5 → lockout → countdown → retry after window                                        | iOS + Android | Lockout UI shown, retry succeeds after window                                                                                           |
| Send EVM testnet tx                                                                            | iOS + Android | Tx confirmed on testnet explorer                                                                                                        |
| Send Solana devnet tx                                                                          | iOS + Android | Tx confirmed on devnet explorer                                                                                                         |
| Send Bitcoin testnet tx                                                                        | iOS + Android | Tx confirmed on testnet explorer                                                                                                        |
| Export encrypted keystore, re-import in a reference tool (e.g. geth/MyEtherWallet for EVM)     | iOS + Android | Reference tool successfully decrypts with the same PIN                                                                                  |
| Social-login (non-password) account creates wallet                                             | iOS + Android | Setup flow works identically to password accounts                                                                                       |
| Backgrounding the app mid-Send (before PIN confirm)                                            | iOS + Android | No decrypted key persists; resuming re-prompts PIN                                                                                      |
| Dark mode / light mode, compact mobile width                                                   | iOS + Android | All wallet screens render correctly at narrow widths, no overflow (this repo has had recurring mobile-overflow bugs — check explicitly) |
| Restore wallet on a "new" device (uninstall + reinstall) using the recovery phrase + a new PIN | iOS + Android | Same addresses re-derived; server's PIN digest updated to the new PIN; old PIN no longer works                                          |
| Restore wallet while a different wallet is already active on this device                       | iOS + Android | Confirm actual behavior matches intent — task 11 only wires the empty-state restore entry point, not a "replace existing" path          |
| Create a second wallet account, open "Manage wallets", switch default                          | iOS + Android | Balances/addresses shown on the wallet tab immediately reflect the new default account                                                  |
| Export backup → PIN prompt → reveal/export screen                                              | iOS + Android | Correct PIN unlocks and shows the export step directly (no re-verify-words step)                                                        |

| Change PIN → verify old PIN no longer works, new PIN works for export/send | Web | Old PIN rejected server-side (lockout tracking reset); new PIN unlocks vault correctly |
| Delete Alternun wallet, keep only MetaMask → click Add → should offer Create/Restore not Add-Account | Web | Routes to WalletCreationFlow not WalletAddAccountFlow (no vault crash) |
| WalletManageModal card shows correct type badge (HD Wallet vs External) | Web | HD accounts show teal badge, MetaMask shows amber badge |
| MetaMask connect → sign challenge → verify → appears in wallet list | Web | Account registered with walletType=external; can be set as default |
| Export backup: wrong PIN → shows "Incorrect PIN", correct PIN → shows export | Web | No false positives; vault-missing case shows "not on this device" not "Incorrect PIN" |

## Acceptance criteria for the feature as a whole

- [ ] All boxes above checked before the feature flag is removed for general availability.
- [ ] A rollback plan exists (feature-flagged, so disabling it hides the UI entry points without needing a
      migration rollback — confirm `wallet_encrypted_seeds`/`wallet_accounts` rows are harmless if the feature flag
      is later turned back off, i.e. no other code path depends on their presence).
