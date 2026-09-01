---
name: wallet-future-server-backup-upgrade
title: 'Archived for later: optional server-side encrypted seed backup (two-factor KMS design)'
priority: low
status: archived-not-scheduled
depends_on: []
---

# Future upgrade — server-side seed backup (not in scope now)

This is **not** part of the current build. Archived here so the original two-factor design isn't lost if the
product later wants cross-device/lost-device recovery beyond "the user exported their own backup."

## What it would add

A second, optional recovery path on top of the device-only model (`00-SPEC.md` §1): the PIN-encrypted seed also
gets pushed to the server, so reinstalling and entering the PIN restores the wallet even if the user never
exported a manual backup.

## Why it's not built now

Explicit product decision (2026-06-29): device-only, MetaMask-style — the user's own export is the only backup.
Adding a server copy means the server becomes a real attack target (a DB leak could expose every user's encrypted
seed at once), which only the original two-factor design below actually defends against.

## The design, preserved for later

1. **`wallet_encrypted_seeds` table** — already migrated and live in the schema (`supabase/migrations/
20260629_0002_wallet_encrypted_seeds.sql`), currently unused. Columns: `ciphertext`, `nonce`, `kdf_params`,
   `kek_version`. RLS owner-only policy already in place.
2. **`wallet_preferences.wallet_binding_secret_ciphertext`/`wallet_binding_secret_key_id`** — also already
   migrated, unused. Holds a per-user 256-bit secret, generated once, **envelope-encrypted under an AWS KMS
   customer-managed key** (none provisioned yet — this is the main new infra cost of turning this on).
3. **Key derivation**, combining the PIN with the server-held secret so a DB-only leak (without KMS access) is
   cryptographically useless even with unlimited offline PIN guesses:
   ```
   KEK = HKDF-SHA256(
     ikm  = PBKDF2-SHA256(pin, salt=user.pin_salt, iterations=210_000),  // reuse packages/wallet's existing KDF
     salt = walletBindingSecret,
     info = "alternun-wallet-kek-v1"
   )
   seed_ciphertext = AES-256-GCM(key=KEK, nonce=random(12), plaintext=bip39_seed)
   ```
4. **Flow**: `POST /v1/wallet/setup` would also receive the encrypted seed blob; `POST /v1/wallet/verify-pin`
   would, on success, KMS-decrypt the binding secret and return it (over TLS) alongside the stored ciphertext so
   the client can derive the same KEK and decrypt locally — the server still never sees a usable decryption key by
   itself, only the post-verification combination does.
5. **New infra needed**: one customer-managed KMS key (`alternun-wallet-binding-key-{stage}`), least-privilege
   `kms:Encrypt`/`kms:Decrypt` IAM scoped to the wallet module's Lambda only. `packages/infra/modules/
identity-resources.ts` is the existing pattern to follow for provisioning it.

## Trigger to revisit

If "users losing wallets after losing their phone without a backup" becomes a real, recurring support burden, or
if Alternun wants wallet recovery to feel as seamless as email/password account recovery — that's the signal to
pull this back out of the archive, not a unilateral engineering call.
