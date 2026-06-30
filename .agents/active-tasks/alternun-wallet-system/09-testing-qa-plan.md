---
name: wallet-testing-qa-plan
title: Cross-cutting test plan — unit, integration, security, manual QA matrix
priority: high
status: todo
depends_on: []
---

# Task 09 — Testing & QA plan

Cross-cutting — write the relevant slice of this alongside each task above as it's built, rather than treating
testing as a final phase. This file tracks the full matrix so nothing is missed.

## Unit tests

- [ ] Task 03 crypto module: KAT-based tests per chain derivation against published BIP-39/32/44/SLIP-0010 vectors,
      PBKDF2/AES-GCM vault round-trips (already partially covered, extend), keystore export/import round-trip.
- [ ] Task 02 service layer: mocked-repository tests for setup/accounts/verify-pin (success, wrong PIN, locked-out,
      server-error paths). Cross-implementation fixture test: same PIN+salt produces identical digest from both
      `packages/wallet` (client) and the server's Node implementation.
- [ ] Task 08 lockout logic: backoff calculation, reset-on-success, concurrent-attempt race (two simultaneous
      verify-pin calls shouldn't double-decrement/under-count attempts — check for a missing transaction/lock).

## Integration tests

- [ ] Full setup → verify-pin (success and lockout paths) round trip against a real (dev) Supabase instance.
- [ ] RLS: confirm a second user's session cannot read/write the first user's `wallet_accounts`/`wallet_preferences`
      rows.

## Security review checklist (run `/security-review`, then manually confirm each of these)

- [ ] No plaintext seed/key/PIN anywhere server-side, in logs, in error responses. Confirm the server genuinely
      never receives a mnemonic, private key, or PIN-derived encryption key at any point — only a PIN digest
      (`pinHash`/`pinSalt`) and public addresses.
- [ ] Brute-force math, stated honestly for the actual threat model (`00-SPEC.md` §3.1): with the chosen
      server-side lockout backoff, compute the worst-case time to exhaust all 10,000 PINs **through the app's own
      UI/API** (should be years, not hours) — and separately confirm the doc is honest that this does _not_
      protect against offline Keychain-extraction attacks, which are out of scope for app-layer mitigation.
- [ ] Confirm `expo-secure-store` is actually backed by the platform Keychain/Keystore (not falling back to plain
      `AsyncStorage` on some platform/Expo-Go combination) — verify this explicitly, since a silent fallback would
      mean the PIN encryption is the _only_ protection with no hardware backing at all.

## Manual QA matrix (mobile)

**Blocking, do this first**: `react-native-quick-crypto` (task 03) was wired but never run on a real device or
simulator from the dev environment used for this implementation pass. Run `expo prebuild` + a real iOS/Android
build and confirm `generateMnemonic()`/`storeMnemonic()`/`unlockMnemonic()`/`exportMnemonicKeystore()` all work
without throwing before testing anything else below — every other row in this table depends on this working.

| Scenario                                                                                   | Platform      | Expected                                                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh install → create wallet → reinstall **without** export                               | iOS + Android | Wallet genuinely unrecoverable (device-only model, §1 — confirm this is true, not an accidental bug)                                    |
| Fresh install → create wallet → export keystore → reinstall → import keystore              | iOS + Android | Same addresses restored from the export                                                                                                 |
| Wrong PIN x5 → lockout → countdown → retry after window                                    | iOS + Android | Lockout UI shown, retry succeeds after window                                                                                           |
| Send EVM testnet tx                                                                        | iOS + Android | Tx confirmed on testnet explorer                                                                                                        |
| Send Solana devnet tx                                                                      | iOS + Android | Tx confirmed on devnet explorer                                                                                                         |
| Send Bitcoin testnet tx                                                                    | iOS + Android | Tx confirmed on testnet explorer                                                                                                        |
| Export encrypted keystore, re-import in a reference tool (e.g. geth/MyEtherWallet for EVM) | iOS + Android | Reference tool successfully decrypts with the same PIN                                                                                  |
| Social-login (non-password) account creates wallet                                         | iOS + Android | Setup flow works identically to password accounts                                                                                       |
| Backgrounding the app mid-Send (before PIN confirm)                                        | iOS + Android | No decrypted key persists; resuming re-prompts PIN                                                                                      |
| Dark mode / light mode, compact mobile width                                               | iOS + Android | All wallet screens render correctly at narrow widths, no overflow (this repo has had recurring mobile-overflow bugs — check explicitly) |

## Acceptance criteria for the feature as a whole

- [ ] All boxes above checked before the feature flag is removed for general availability.
- [ ] A rollback plan exists (feature-flagged, so disabling it hides the UI entry points without needing a
      migration rollback — confirm `wallet_encrypted_seeds`/`wallet_accounts` rows are harmless if the feature flag
      is later turned back off, i.e. no other code path depends on their presence).
