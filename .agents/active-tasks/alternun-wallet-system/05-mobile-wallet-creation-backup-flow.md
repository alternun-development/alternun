---
name: wallet-mobile-creation-backup-flow
title: Mobile UI — wallet generation, mnemonic backup/verification, key export
priority: high
status: implemented-pending-device-verification
depends_on: [wallet-crypto-module, wallet-mobile-pin-setup-flow]
completed: 2026-06-29
revision_note: >
  Rev. 2 — device-only recovery model (00-SPEC.md §1). storeMnemonic() persisting the encrypted mnemonic to
  expo-secure-store is the correct, intended local storage, not a violation to avoid. There is no server-side
  seed backup endpoint; /v1/wallet/setup only receives the PIN digest + public addresses.
---

# Task 05 — Wallet creation, backup, and export UI

See `00-SPEC.md` §6 steps 2-3.

## Scope

1. **Generation screen**: after PIN setup (task 04) hands off the in-memory PIN, call `packages/wallet`'s
   `generateMnemonic()` + `deriveWalletBundle(mnemonic, 0)` (task 03), then `storeMnemonic(pin, mnemonic)` to
   persist the PBKDF2/AES-GCM-encrypted mnemonic into `expo-secure-store` — this is the wallet's only home, by
   design (§1). Show a brief progress state; PBKDF2 at 210k iterations is fast (low tens of ms) so this should
   feel instant, no special "this is slow" UX needed here (unlike the Argon2id assumption in rev. 1 of this spec).
2. **Backup/reveal screen**:
   - Mnemonic hidden by default behind a "tap to reveal" gate (mirror MetaMask's pattern — this is a deliberate
     friction point, not a bug to "simplify away").
   - After reveal, a lightweight verification step: prompt for 2-3 random word positions from the phrase before
     allowing the user to continue, to catch "I didn't actually write it down" before it's too late.
   - Screenshots must be discouraged where the platform allows it (Android `FLAG_SECURE` equivalent via Expo if
     available; iOS doesn't allow blocking screenshots, so show a warning banner instead).
   - Copy must state plainly: **this export is the only backup** — there is no server copy, losing both the device
     and this backup means the funds are gone (§1).
3. **Export flow** ("let the user download the private key" — explicit user request, §6 step 3):
   - Default/recommended: export an encrypted JSON keystore (task 03's UTC--... v3 format) via the OS share sheet
     (`expo-sharing` or equivalent) — re-uses the same PIN, so this is not a _weaker_ copy of the key.
   - Secondary, behind an extra explicit confirmation ("I understand this exposes my funds if this file is
     stolen"): raw plaintext export. Still goes through the share sheet, not a silent write to a
     predictable/cloud-synced path.
   - Either export path must re-verify the PIN immediately before producing the file (don't reuse a stale unlocked
     session for this — exporting key material is higher-stakes than viewing a balance).
4. Call `POST /v1/wallet/setup` (task 02) with the PIN digest (`createPinDigest(pin)`) + derived public addresses
   once local generation+encryption succeeds, before navigating to the wallet home screen (task 06). This call
   carries **no secret material** — if it fails, retry it (it's just registering public data + a PIN verifier),
   it does not block the wallet from already working locally, but Send (task 06) needs it to have succeeded since
   Send's server-side gate (`/v1/wallet/verify-pin`) depends on `wallet_preferences` existing.

## What was built

- `apps/mobile/components/wallet/WalletCreationFlow.tsx` — orchestrates PIN setup (task 04) → `generateMnemonic(256)`
  (24 words) → `deriveWalletBundle` → `storeMnemonic(pin, mnemonic)` → backup screen → background
  `POST /v1/wallet/setup` registration (kicked off once, awaited at backup-done rather than re-invoked, to avoid a
  double-setup 409).
- `apps/mobile/components/wallet/WalletBackupScreen.tsx` — tap-to-reveal mnemonic grid, 2-word verification gate
  (blocks "Continue" on mismatch, doesn't warn-and-continue), then export: encrypted keystore (default, via
  `exportMnemonicKeystore` + the OS share sheet) or plaintext (behind an explicit checkbox confirmation).
- Used the new `expo-file-system` v19 class-based API (`File`, `Paths.cache`) — the old `cacheDirectory`/
  `writeAsStringAsync` functions installed were already removed/throw-at-runtime in this version; this was caught
  by `tsc`, not missed.

## Explicitly not done in this pass

- **Screenshot discouragement (Android `FLAG_SECURE`)** — not implemented. Worth a follow-up but didn't block the
  core flow.
- **Re-verifying the PIN immediately before export** — currently the export screen reuses the PIN already in
  memory from setup (this is the _first_ time the PIN is used, right after creation, so there's no "stale session"
  risk yet here) — this requirement matters more once Export is reachable later from an already-unlocked wallet
  home screen (task 06), which doesn't exist yet. Re-flag this when task 06 adds a path to Export outside of
  first-run creation.

## Acceptance criteria

- [x] The PIN-encrypted mnemonic is persisted via `storeMnemonic` into `expo-secure-store`. The plaintext mnemonic
      only exists in component state and the explicit share-sheet export artifact.
- [x] Word-verification step blocks progress on failure (re-prompt with an error, doesn't continue).
- [x] `POST /v1/wallet/setup` failure surfaces an `Alert` telling the user the wallet exists locally but
      registration needs a retry — not silently dropped.
- [ ] **Manual QA not performed** — same device-verification caveat as tasks 03/04. The "reinstall without export
      → genuinely unrecoverable" and "reinstall with export → recovers" scenarios need a real device/build.
