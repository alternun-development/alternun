---
name: wallet-mobile-pin-setup-flow
title: Mobile UI — PIN creation/confirmation screen and PIN-unlock screen
priority: high
status: implemented-pending-device-verification
depends_on: [wallet-server-module-api, wallet-crypto-module]
completed: 2026-06-29
---

# Task 04 — PIN setup & unlock UI

See `00-SPEC.md` §6 steps 1 and 5 (the re-enter-PIN-to-send case reuses this same unlock component).

## Scope

1. New screen/component in `apps/mobile/components/wallet/` (new directory — this feature is large enough to merit
   its own component folder, don't bury it inside `components/auth/` or `components/dashboard/`):
   - `PinSetupScreen.tsx` — two-step 4-digit entry (create, confirm), numeric keypad UI, copy explaining the PIN
     cannot be recovered by Alternun.
   - `PinUnlockScreen.tsx` — reusable single 4-digit entry used both for the "Send" re-auth flow (task 06) and any
     other place that needs to re-derive the KEK. Must show remaining-attempts / lockout countdown when the server
     returns a lockout response from `/v1/wallet/verify-pin` (task 02/08).
2. Wire `PinSetupScreen` to call `packages/wallet`'s `createPinDigest(pin)` (task 03) to get `{salt, hash}`, hold
   the raw PIN only in memory (short-lived React state, not AsyncStorage/SecureStore — never persisted), and on
   confirm hand off to task 05's wallet-creation flow which will call `generateMnemonic`/`deriveWalletBundle`/
   `storeMnemonic(pin, mnemonic)` and then `POST /v1/wallet/setup` with the digest + derived public addresses.
3. Entry point: add a second primary action button "Crear wallet Alternun" next to the existing "Conectar
   billetera" button in `apps/mobile/app/mi-perfil.tsx` (near line 2273's `walletConnected` ternary — this screen
   currently only handles the external-wallet-connected/not-connected states; this task adds a third state for the
   internal wallet).
4. i18n: add new keys under a `wallet.pin.*` namespace in `packages/i18n/src/catalogs/{en,es,th}.json`, following
   the existing `dashboard.summaryCards.*` nesting convention used elsewhere in this catalog.

## What was built

- `apps/mobile/components/wallet/PinPad.tsx` — reusable 4-digit numeric keypad, dot indicators, delete key.
- `apps/mobile/components/wallet/PinSetupScreen.tsx` — create → confirm flow, mismatch resets to step 1, the
  device-only-recovery explainer copy from `00-SPEC.md` §6 step 1.
- `apps/mobile/components/wallet/PinUnlockScreen.tsx` — single PIN entry, calls a provided `onSubmit`, renders a
  live countdown when the server returns `lockedUntil`, calls `onUnlocked()` on success. Generic enough to reuse
  for task 06's Send re-auth (that's the intent — not wired to Send yet since Send doesn't exist).
- `apps/mobile/components/wallet/walletApiClient.ts` — thin client for `/v1/wallet/{setup,accounts,verify-pin}`,
  mirrors `AIRSLeaderboard.tsx`'s bearer-token-from-`getSessionToken()` pattern.
- Wired into `apps/mobile/app/mi-perfil.tsx`'s `WalletTab`: a second primary button "Crear wallet Alternun" next
  to "Connect Wallet", only shown when no local wallet exists yet (checked via `GET /v1/wallet/accounts`).

## Acceptance criteria

- [x] PIN is held in component state only, cleared on cancel/success — verified by reading the implementation
      (no `AsyncStorage`/`localStorage` writes anywhere in these files).
- [x] Confirm-PIN step rejects mismatches with a clear retry (resets to the "create" step, doesn't silently accept).
- [x] Lockout state (`lockedUntil`) rendered with a live countdown (`PinUnlockScreen`'s `setInterval` ticking the
      displayed `mm:ss`).
- [ ] **i18n keys not yet added to the catalogs** — every string uses `t(key, undefined, fallback)` with an
      English fallback (e.g. `wallet.pin.setup.createTitle`), so nothing is hardcoded/missing at runtime, but the
      `wallet.pin.*` namespace itself doesn't exist yet in `packages/i18n/src/catalogs/{en,es,th}.json`. Real
      translations (especially the Spanish device-only-recovery explainer, which needs to be precise, not just
      machine-translated) are a follow-up — flagging honestly rather than claiming this is done.
- [x] Works in both light/dark theme — uses the same `isDark` ternary palette pattern as the rest of the app.
- [ ] **Not run on a real device** — same caveat as task 03, this whole flow is unverified outside `tsc`.
