---
name: wallet-multi-wallet-restore-default-account
title: Multi-wallet support, device-change recovery (restore from mnemonic), default account selection
priority: high
status: implemented-pending-live-verification
depends_on:
  [
    wallet-db-schema-migration,
    wallet-server-module-api,
    wallet-crypto-module,
    wallet-mobile-creation-backup-flow,
  ]
completed: 2026-06-30
---

# Task 11 — Multi-wallet, restore, default account

User-requested (2026-06-30): "Export backup" button did nothing (no `onPress` at all — same dead-button class as
"Connect external wallet"); users need a way to recover their wallet on a new device from their recovery phrase +
PIN; users need to be able to hold more than one wallet per account with a selectable default used for reward
payouts, which can be an Alternun-managed wallet or an externally-linked one.

## What was already true (no schema change needed for this part)

`wallet_accounts` (task 01) already supported multiple rows per user — only a partial unique index enforces _at
most one_ `is_primary = true` row per user, nothing prevented additional rows. `wallet_type` already had a check
constraint allowing `'airs_hd' | 'external'`. The gap was entirely in the API surface and mobile UI, not the schema.

## What was implemented

1. **Fixed the dead "Export backup" button** (`mi-perfil.tsx`) — had zero `onPress` handler. Wired through a PIN
   re-entry (`PinUnlockScreen` → server `verifyPin` → local `unlockMnemonic`) into `WalletBackupScreen` with a new
   `initialStep='export'` prop that skips the reveal/verify steps (PIN re-entry is the re-authentication; word
   verification exists to confirm a _brand-new_ backup was written down, not relevant on re-export).
2. **Device-change recovery (`WalletRestoreFlow.tsx`, new)**: mnemonic input (validated via `validateMnemonic`) →
   PIN setup (reusing `PinSetupScreen`) → re-derive the same addresses locally → `storeMnemonic` locally → new
   `POST /v1/wallet/restore` endpoint.
   - `restore` differs from `setup`: `setup` rejects if `wallet_preferences.has_local_wallet` is already true
     (first-time-only). `restore` is allowed to overwrite the PIN digest and primary account addresses for an
     already-authenticated user — the session token is the actual identity proof, the wallet PIN is a secondary,
     resettable local-decryption secret. New repository functions `upsertWalletPreferences`/
     `upsertPrimaryWalletAccount` (update-if-exists-else-insert) back this.
   - Entry point: "Restore from recovery phrase" button replaces the previously-dead "Connect external wallet"
     button in the empty/create state (see "explicitly not done" below for why real external-wallet linking is
     separate).
3. **Default account selection (`WalletManageModal.tsx`, new)**: lists all of the user's `wallet_accounts` via the
   existing `GET /accounts`, shows which is the default (`isPrimary`), and a "Set as default" action per
   non-default row, backed by a new `PATCH /v1/wallet/accounts/:id/primary` endpoint. Reachable via a new "Manage
   wallets" button next to "Export backup" on the wallet card. Switching default updates `mi-perfil.tsx`'s
   `localAccount` (the account driving balances/send/receive/addresses) and refreshes balances.
   - `setPrimaryWalletAccount` repository function does the swap as two sequential PATCH calls (unset old primary,
     then set new) — required because the partial unique index on `(user_id) where is_primary = true` would
     conflict if both were attempted as `true` simultaneously; doing it in this order means there's a brief window
     with no primary set rather than a conflict, which is the safe direction to fail in.
4. **`WalletAccountDto`/`insertWalletAccount` extended** with optional `walletType` (`'airs_hd' | 'external'`,
   defaults to `'airs_hd'`) and `label` fields, so a future external-wallet-linking flow can call the _existing_
   `addAccount`/`POST /v1/wallet/accounts` endpoint with `walletType: 'external'` and a manually-provided address
   — no new endpoint needed for that part when it's built.

All new repository functions (`upsertWalletPreferences`, `upsertPrimaryWalletAccount`, `setPrimaryWalletAccount`)
were smoke-tested directly against the live dev database (insert path, update path, primary-switch path) before
being wired into the API — confirmed correct, including that switching primary correctly leaves exactly one row
with `is_primary = true`.

## Explicitly not done in this pass

- **Real external wallet linking (e.g. MetaMask via WalletConnect) is NOT implemented.** This needs actual
  signature-based ownership proof (the user signs a challenge message with their external wallet) before an
  externally-supplied address can be trusted enough to receive reward payouts — without that, anyone could paste
  any address and claim it. That's a materially different, larger integration (WalletConnect/wagmi SDK, a
  challenge/sign/verify flow, `viem`'s signature recovery on the server) than the device-recovery and
  default-account work here. The schema/API already has a `walletType: 'external'` extension point ready for it
  (see point 4 above) — this should be a dedicated follow-up task, not bolted onto this one.
- **No re-verification of the restored wallet's PIN-failure counters reset** beyond what `upsertWalletPreferences`
  already does (`pin_failed_attempts: 0, pin_locked_until: null`) — reasonable since a successful restore is by
  definition a fresh start.
- **No UI to remove/deactivate a wallet account** (`wallet_accounts.is_active` column already exists in the schema
  from task 01 but nothing reads or writes it yet) — out of scope, not requested.
- **Manual QA on a real device not performed** — same caveat as every other wallet task; the new flows
  (`WalletRestoreFlow`, `WalletManageModal`, the export-backup fix) are typecheck-clean and the backend repository
  functions are live-DB-verified, but the full client UI flow has not been exercised end-to-end by the user yet.

## Acceptance criteria

- [x] "Export backup" actually opens the export flow (PIN-gated).
- [x] A user can restore their wallet on a (simulated) new device given their mnemonic + a new PIN, and the
      server's PIN digest/primary account record update to match — verified via direct repository-level testing
      against the dev DB, not yet via the full mobile UI by the user.
- [x] A user with more than one `wallet_accounts` row can see all of them and change which is default.
- [x] Changing the default account updates which addresses/balances are shown without requiring an app restart.
- [ ] User has not yet confirmed the full restore flow end-to-end through the mobile UI.
