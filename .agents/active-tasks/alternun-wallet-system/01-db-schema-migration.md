---
name: wallet-db-schema-migration
title: DB migration — encrypted seed storage, PIN lockout columns, envelope secret column
priority: high
status: done
depends_on: []
completed: 2026-06-29
migration_file: supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql
---

# Task 01 — DB schema migration

See `00-SPEC.md` §4 for full rationale. This task is pure SQL + supabase migration, no app code.

## Scope

1. ✅ New migration file `supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql`:
   - `create table public.wallet_encrypted_seeds` exactly as specified in `00-SPEC.md` §4.1.
   - RLS owner-only policy, mirroring `wallet_accounts_user_owns_rows` in
     `supabase/migrations/20260417_0008_create_airs_wallet_tables.sql:90-96`.
   - `grant select, insert, update, delete on public.wallet_encrypted_seeds to authenticated;`
   - Add the `updated_at` trigger reusing `public.wallet_records_set_updated_at()` (already defined in
     `20260417_0008_create_airs_wallet_tables.sql:58-66` — do not redefine it).
2. ✅ `pin_failed_attempts`/`pin_locked_until` added to `wallet_preferences` (§4.2).
3. ✅ Added `wallet_binding_secret_ciphertext`/`wallet_binding_secret_key_id` columns. **Superseded (00-SPEC.md rev.
   2):** after this migration landed, the product decision came back as device-only/MetaMask-style recovery (no
   server-side seed backup) — these columns and `wallet_encrypted_seeds` are now **deferred/unused**, no AWS KMS
   key needed for v1. Left in place since they're additive/harmless, not removed.
4. ✅ Dry-run confirmed only this migration was pending, applied via `pnpm --filter @alternun/api run db:migrate`
   against dev. No errors.

## Acceptance criteria

- [x] Migration applies cleanly (idempotent `if not exists` guards) — confirmed against the existing dev DB.
- [x] RLS verified with a real two-user manual test (two existing `auth.users` rows, switched `request.jwt.claims` + `set local role authenticated` mid-transaction, rolled back after): user A can read/insert their own row;
      user B gets 0 rows reading user A's row and a hard RLS violation attempting to insert as user A.
- [x] `pin_failed_attempts` defaults to `0`, `pin_locked_until` defaults to `null` — verified via
      `information_schema.columns`.
- [x] No existing migration modified — purely additive (`supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql`).
