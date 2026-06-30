---
name: alternun-wallet-system
title: Non-custodial multi-chain Alternun Wallet (EVM + Solana + Bitcoin)
priority: high
status: in-progress
owner: unassigned
created: 2026-06-29
revised: 2026-06-29
revision_note: >
  Rev. 2 — discovered pre-existing packages/wallet (commits 189b8f0a, 8a4dbbe6, April) implementing most of the
  crypto primitives, and confirmed (per product decision) the wallet is device-local only, no server-side seed
  backup. This removed the AWS KMS / walletBindingSecret two-factor design from rev. 1 entirely. See §3/§4 below
  for the corrected design. wallet_encrypted_seeds (migrated in task 01) is now unused/deferred, not deleted.
---

# Alternun Wallet System — Spec

## 1. Problem & goal

Today "Mi perfil → Billetera" (`apps/mobile/app/mi-perfil.tsx:90-94, 2019, 2273`) only supports
**connecting an external wallet** (MetaMask / WalletConnect, EIP-1193) via
`apps/mobile/components/auth/walletBridge.ts:95-130` and
`packages/auth/src/mobile/AlternunMobileAuthClient.ts:19-20` (`WALLET_PROVIDERS = ['metamask', 'walletconnect']`).
There is no internal/custodial-free wallet — the "Wallet principal · Interna" badge and address shown in
`apps/mobile/components/dashboard/DashboardSummaryCards.tsx` are currently **hardcoded placeholder UI**, not backed
by real data.

We need Alternun to be able to **create a real wallet for the user**, client-generated, multi-chain
(Ethereum/EVM, Solana, Bitcoin — like MetaMask's multi-chain HD wallet model), where:

- The private key / seed is **never stored raw**, anywhere, ever.
- It is encrypted with a key derived from a **4-digit PIN** the user sets specifically for this ("sign password").
- The user can **export/download** their key once they've set up the wallet.
- The user can **send / receive / view balances** for the wallet from the app.
- **Recovery model (explicit product decision): device-only, MetaMask-style.** The seed lives only in the device's
  hardware-backed secure storage (Keychain/Keystore via `expo-secure-store`), PIN-encrypted on top of that. There is
  **no server-side backup of the seed.** If a user loses their device without having exported their seed phrase,
  the wallet is unrecoverable — this is accepted, not a bug, and must be communicated clearly in the UI (§6 step 1).

### What already exists

**`packages/wallet` (`@alternun/wallet`, commits `189b8f0a`, `8a4dbbe6`)** — a phase-1 scaffold, fully unused by any
app today (verified: zero references to `@alternun/wallet` outside the package itself), implementing:

- `generateMnemonic`/`validateMnemonic`/`mnemonicToSeed` (`src/crypto/mnemonic.ts`) — BIP-39 via the `bip39` package.
- `deriveEvmAccount`/`deriveBitcoinAccount`/`deriveSolanaAccount`/`deriveWalletBundle`
  (`src/crypto/{evmDerive,bitcoinDerive,solanaDerive,hdWallet}.ts`) — multi-chain HD derivation.
- `storeMnemonic`/`unlockMnemonic`/`clearMnemonic`/`createPinDigest`/`verifyPin`/`wipeBytes`
  (`src/storage/secureVault.ts`) — PIN-encrypted vault on top of `expo-secure-store`, using **PBKDF2-SHA256
  (210,000 iterations) + AES-256-GCM via native WebCrypto** (`globalThis.crypto.subtle`).
- Tests in `test/wallet.test.js` covering all of the above with known addresses for the standard test mnemonic.

**This is the foundation for task 03 and is largely complete.** This spec adopts its existing crypto choices
(PBKDF2/AES-GCM, not Argon2id/XChaCha20 as rev. 1 of this spec proposed) rather than rewriting working, tested code.
See §3 for what's still missing (4-digit-PIN UX default, BIP-84 path note, server-side PIN lockout) and §7 task 03
for the remaining scope.

A DB schema also already exists for the server-side pieces (verified: no app code references it yet before this
effort):

- `supabase/migrations/20260417_0008_create_airs_wallet_tables.sql`
  - `wallet_accounts` — `wallet_type ('airs_hd'|'external')`, `evm_address`, `bitcoin_address`, `solana_address`,
    `derivation_index`, `is_primary`. Stores **public addresses only**, no secret material — used as-is.
  - `wallet_preferences` — `pin_salt`, `pin_hash`, `has_local_wallet`, plus `pin_failed_attempts`/
    `pin_locked_until` added in task 01 (§4.1). This is the **server-side PIN re-verification gate** (§3.2), not a
    decryption mechanism — the actual decryption is 100% local and never touches the server.
  - `wallet_sessions` — `session_key`, `wallet_account_id`, `expires_at`. Usable for short-lived "wallet unlocked"
    UX sessions.
- `wallet_encrypted_seeds` (added in task 01, `supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql`) and
  the `wallet_binding_secret_*` columns on `wallet_preferences` are **deferred/unused** under the device-only
  recovery model — left in place (harmless, additive) in case a future "optional cloud backup" feature wants them,
  but no task in this plan writes to them. Do not build against them without revisiting this decision.
- `supabase/migrations/20260303_0001_create_user_wallets.sql` (`user_wallets`) and
  `supabase/migrations/20260320_0004_link_wallets_to_app_users.sql` are the **older external-wallet-only** tables
  (still used for MetaMask/WalletConnect linking) — leave those alone, this feature is additive.

## 2. Non-negotiable security ground rules

1. **Plaintext seed/private key never leaves the device**, never logged, never sent to any server endpoint, never
   written to crash reports/Sentry breadcrumbs.
2. **The server never has any information that could decrypt a wallet.** The encrypted seed lives only in
   `expo-secure-store`; the server only ever stores a `pin_hash`/`pin_salt` _verifier_ (§3.2), which by itself
   cannot decrypt anything.
3. **The server-side PIN-verification gate is rate-limited and lockable per-user** (independent of any IP-based
   throttling), because a 4-digit PIN is only 10,000 combinations. This protects the common "found/stolen unlocked
   phone, guessing PINs through the app UI" threat. It does **not** and cannot protect against a sophisticated
   on-device Keychain-extraction attack (jailbreak/root + forensics) — that threat is mitigated by the OS's secure
   storage guarantees, not by this app, and must be stated plainly in this doc rather than implied to be solved.
4. Treat this module with the same scrutiny as auth: any change here gets a security-focused review pass
   (`/code-review` or `/security-review`) before merge, not just the standard review.

## 3. Cryptographic design

### 3.1 Local encryption (already implemented — `packages/wallet/src/storage/secureVault.ts`)

```
salt = random(16 bytes)
key  = PBKDF2-SHA256(pin, salt, iterations=210_000, length=256 bits)   // native WebCrypto, non-extractable
ciphertext, iv = AES-256-GCM(key, plaintext = JSON{mnemonic, createdAt})
// stored as { version: 1, ciphertext, iv, salt } (base64) in expo-secure-store under "airs_encrypted_mnemonic"
```

`unlockMnemonic(pin)` simply attempts the decrypt and returns `null` on failure (wrong PIN or no AEAD tag match) —
this is the **entire** local PIN-check, no server round trip required for it to work correctly. 210,000 PBKDF2
iterations is OWASP's current minimum recommendation for PBKDF2-SHA256; this is a reasonable, already-implemented
choice — task 03 does not need to change it.

**Known limitation, stated explicitly (do not "fix" without a product conversation):** because there is no second
factor (per the device-only recovery decision in §1), an attacker who extracts the raw Keychain blob can brute
-force all 10,000 PIN combinations offline in well under an hour on ordinary hardware. This is the same exposure
MetaMask mobile and most non-custodial mobile wallets accept by default; mitigation is the OS secure-enclave
extraction difficulty (requires root/jailbreak + forensics tooling), not app-layer cryptography. If this risk is
ever judged unacceptable, the fix is a product-level change (e.g. require a longer passphrase, or reintroduce a
server-held second factor with cloud backup) — not a quiet crypto tweak.

### 3.2 Server-side PIN re-verification gate (defense in depth, task 02/08 — new work)

Distinct from §3.1's local decrypt. Used to gate **sensitive actions taken through the app's normal UI** (Send,
Export) with server-enforced, per-user rate limiting — protecting the "found an unlocked phone, guessing PINs in
the app" scenario even though it can't stop offline Keychain extraction (§3.1's limitation).

```
pin_digest = createPinDigest(pin)   // already implemented: PBKDF2-derived, exported-key hash + salt
                                     // (packages/wallet/src/storage/secureVault.ts:176-185)
```

- At wallet setup, the client calls `createPinDigest(pin)` locally and sends `{salt, hash}` to
  `POST /v1/wallet/setup`, which stores them in `wallet_preferences.pin_salt`/`pin_hash`.
- Before Send/Export, the client calls `POST /v1/wallet/verify-pin` with the PIN (over TLS) — the server recomputes
  the digest server-side (reusing the **same** PBKDF2 derivation, ported to Node's `crypto` module — see task 02)
  and compares to the stored hash using constant-time comparison (mirror
  `packages/wallet/src/storage/secureVault.ts:199-208`'s constant-time loop).
- On failure: increment `pin_failed_attempts`; lock out with exponential backoff after 5 attempts (task 08).
- On success: reset `pin_failed_attempts` to 0; client proceeds to call `unlockMnemonic(pin)` **locally** to
  actually get the seed. The server's "yes" is necessary-but-not-sufficient — local decrypt is still the real gate.
- This means a PIN is checked **twice** per sensitive action (once server-side for rate-limiting/audit, once
  locally for actual decryption) — by design, not redundant: each check defends a different attack surface.

### 3.3 Multi-chain HD derivation (already implemented — `packages/wallet/src/crypto/*Derive.ts`)

| Chain                                                                                                      | Path (as implemented)                                                        | Curve               | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ethereum / other EVM chains (Polygon, Celo — reuse the same address per `mi-perfil.tsx`'s `NETWORKS` list) | `m/44'/60'/0'/0/{accountIndex}`                                              | secp256k1           | Matches MetaMask's actual convention (account' fixed at 0', address_index increments) — this is correct, not a bug, despite differing from rev. 1 of this spec.                                                                                                                                                                                                                                                                                                                                                                          |
| Bitcoin                                                                                                    | `m/44'/0'/0'/0/{accountIndex}`, rendered as native segwit (`bc1...`, p2wpkh) | secp256k1           | **Known deviation**: BIP-84 (`m/84'/...`) is the standard purpose for native segwit, not BIP-44. Functionally produces valid `bc1...` addresses either way; the path label just won't auto-match in wallets that infer script type from purpose. Acceptable for v1 since this package is the only consumer of its own derivation (no interop requirement yet) — flag as a documented, deliberate deviation rather than silently "fixing" it once real wallets exist, since changing it later would orphan any already-derived addresses. |
| Solana                                                                                                     | `m/44'/501'/{accountIndex}'/0'`                                              | ed25519 (SLIP-0010) | Matches Phantom/Solflare convention exactly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`accountIndex` is the parameter already threaded through `deriveWalletBundle(mnemonic, accountIndex)`, mapping
directly to `wallet_accounts.derivation_index` — multiple `wallet_accounts` rows per user share one local seed but
use increasing `derivation_index` (mirrors MetaMask's "add account").

## 4. Data model — what task 01 already migrated, and how it's actually used now

`supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql` (task 01) added: the `wallet_encrypted_seeds` table,
`wallet_preferences.pin_failed_attempts`/`pin_locked_until`, and `wallet_preferences.wallet_binding_secret_*`
columns. Per the device-only recovery decision (§1), **only the lockout columns are used going forward**:

- `wallet_encrypted_seeds` — unused, deferred. Do not write to it. No follow-up migration needed to remove it
  (additive columns/tables are cheap to leave; removing them now would be churn for a decision that could
  legitimately change again later if cloud backup becomes a real product ask).
- `wallet_preferences.wallet_binding_secret_ciphertext`/`wallet_binding_secret_key_id` — unused, deferred, same
  reasoning. **No AWS KMS key needs to be provisioned for v1** — this removes that entire piece of infra work from
  task 02.
- `wallet_preferences.pin_salt`/`pin_hash`/`pin_failed_attempts`/`pin_locked_until` — **actively used**, per §3.2.
- `wallet_accounts` — **actively used**, stores public addresses only.
- `wallet_sessions` — **actively used** for the "unlocked for N minutes" UX window (§6).

## 5. Backend API surface (new NestJS module `apps/api/src/modules/wallet`)

Follow the existing module conventions in `apps/api/src/modules/airs/` (controller + service + repository split,
bearer-token auth via `Headers('authorization')` exactly like `airs.controller.ts:58-79`).

| Endpoint                     | Purpose                                                                                                                                                                                                                                                    | Rate limit                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `POST /v1/wallet/setup`      | First-time: client sends `{salt, hash}` from local `createPinDigest(pin)` + the derived public addresses; server creates `wallet_preferences` (`has_local_wallet=true`) and `wallet_accounts` rows. No secret material in this request.                    | per-user, 1/min                                           |
| `POST /v1/wallet/accounts`   | Register additional derived `wallet_accounts` rows (e.g. "add account") — addresses + `derivation_index`, public data only.                                                                                                                                | per-user                                                  |
| `POST /v1/wallet/verify-pin` | §3.2's gate. On success, also touch/create a `wallet_sessions` row (short TTL) so the client can skip _friction_ (not re-derivation) on subsequent actions within the window. On failure, increment `pin_failed_attempts`; lock out per task 08's backoff. | **strict**: 5 attempts / exponential backoff, see task 08 |
| `GET /v1/wallet/balances`    | Read-only proxy to chain RPC providers (caches per chain) so RPC API keys/quotas stay server-side.                                                                                                                                                         | per-user                                                  |
| `GET /v1/wallet/activity`    | Read-only tx history proxy.                                                                                                                                                                                                                                | per-user                                                  |
| `POST /v1/wallet/broadcast`  | Proxies an already-signed transaction to the chain RPC (server never sees the private key, only the final signed payload). Centralizes RPC credentials/rate limiting consistently with the read endpoints above.                                           | per-user                                                  |

No signing endpoint exists or should exist — transaction signing happens **only** client-side with the in-memory
decrypted key (from `unlockMnemonic`), then the signed tx goes to `/v1/wallet/broadcast`.

## 6. Mobile app flow

Entry point: `apps/mobile/app/mi-perfil.tsx` "Billetera" tab, the existing "Conecta tu billetera" screen
(screenshot reference: `Conectar billetera` button, `NETWORKS` pills at line 90-94). Add a **second primary action**
next to "Conectar billetera": **"Crear wallet Alternun"**.

1. **Create PIN** — two 4-digit PIN entry screens (enter, confirm). Explain in-copy, plainly: "This PIN encrypts
   your wallet on this device only. Alternun never sees it and cannot recover your wallet if you forget this PIN
   and lose your backup phrase." (Per §1's device-only model — do not soften this copy.)
2. **Generating wallet** — client calls `generateMnemonic()`, `deriveWalletBundle(mnemonic, 0)` (already
   implemented — verify `bip39`'s entropy source is backed by a real CSPRNG in the RN/Hermes runtime before relying
   on it, see task 03), then `storeMnemonic(pin, mnemonic)` to encrypt+persist locally, then `createPinDigest(pin)`
   - the derived public addresses go to `POST /v1/wallet/setup` → `/v1/wallet/accounts`.
3. **Backup screen** — reveal the mnemonic once, require the user to tap-to-reveal (not shown by default, mirrors
   MetaMask), then a lightweight verification step (re-enter 2 random words from the phrase) before continuing.
   Offer **"Export private key"** (advanced, separate confirmation, separate explicit warning copy) which writes an
   encrypted JSON keystore file (UTC--... v3-style, re-using the same PIN) to the device's share sheet — never a
   silent write to a cloud-synced folder. A raw-plaintext export option may exist behind an extra "I understand the
   risk" confirmation, per explicit user request, but encrypted-keystore should be the default/recommended path.
   **This export is the user's only backup under the device-only recovery model — say so explicitly in the UI.**
4. **Wallet home** — replaces the placeholder "Wallet principal · Interna" card in `DashboardSummaryCards.tsx` with
   real balances (EVM/BTC/SOL) sourced from `/v1/wallet/balances`. Send / Receive / Activity tabs.
5. **Send** — select chain/asset → amount/recipient → **re-enter PIN** → client calls `/v1/wallet/verify-pin`
   (server gate, §3.2) → on success, calls `unlockMnemonic(pin)` **locally** → re-derives the signing key for the
   selected chain/account → signs tx → `POST /v1/wallet/broadcast` → clears decrypted key from memory immediately.
6. **Receive** — QR + copyable address per chain, no PIN required (read-only).

Cache the "unlocked" state for a short window (`wallet_sessions.expires_at`, e.g. 5 minutes) so the user isn't
re-prompted for the PIN on every single screen within one session — but the actual decrypted key must **not** be
kept around for that whole window; only a flag that skips the _friction_ of a second "are you sure" prompt, not a
skip of the cryptographic re-derivation. Don't cheat this for UX — re-derive (both server verify-pin and local
decrypt) every time a signature is actually needed.

## 7. Subtasks

See the numbered files in this folder. Suggested order / dependency chain:

1. `01-db-schema-migration.md` — ✅ done.
2. `02-server-wallet-module-api.md` — depends on 01. **No KMS provisioning needed** (rev. 2 — see §4).
3. `03-crypto-key-derivation-module.md` — builds on the existing `packages/wallet`, not a new package. No DB
   dependency, can run in parallel with 01/02.
4. `04-mobile-pin-setup-flow.md` — depends on 02, 03.
5. `05-mobile-wallet-creation-backup-flow.md` — depends on 03, 04.
6. `06-mobile-wallet-home-send-receive.md` — depends on 02, 03, 05.
7. `07-multichain-rpc-integration.md` — depends on 02 (balances/activity/broadcast proxy endpoints).
8. `08-rate-limiting-security-hardening.md` — depends on 02; should land before this ships to any real users.
9. `09-testing-qa-plan.md` — cross-cutting, write alongside each task above, not at the end.

## 8. Explicit non-goals (v1)

- No server-side custody, ever — this is non-custodial by design.
- No server-side seed backup/cross-device recovery (§1) — the user's exported backup is the only recovery path.
- No multi-seed / multi-wallet-per-user beyond `derivation_index` accounts under one seed.
- No hardware wallet support.
- No in-app DEX/swap — just send/receive/balance/activity.
- No biometric-only unlock that bypasses the PIN cryptographically — biometrics may gate local secure-storage
  access as a convenience layer, but must not become an alternate path to derive the decryption key.
- No AWS KMS / envelope encryption work for v1 (removed in rev. 2 along with the server-backup decision).
