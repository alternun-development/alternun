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

## 2026-06-30 fix: wrong FK target, real wallet creation was failing in production

The original `20260417_0008` migration's FK (`user_id references auth.users(id)`) and the RLS test above (done
against real `auth.users` rows) both missed that the app's actual users live in `public.users`, which is
_intentionally_ not linked to `auth.users` (own UUID/text ID space — see `20260319_0003`'s header comment).
`resolveUserId()` (the primary Authentik/JWT auth path) returns a `public.users.id`, so every real wallet
creation attempt hit a foreign key violation — silently caught client-side, making it look like the UI was
broken rather than the DB constraint. New migration `20260630_0001_fix_wallet_tables_user_fk.sql`:

- Repoints `wallet_accounts`/`wallet_preferences`/`wallet_sessions`/`wallet_encrypted_seeds`'s `user_id` FK to
  `public.users(id)`.
- Also had to convert `user_id` from `uuid` to `text` — live dev schema has `public.users.id` as `text` (not the
  `uuid` originally declared in `20260319_0003`; superseded by an undocumented schema change). Values are still
  UUID-formatted strings, so this was a safe, lossless cast; all 4 tables were empty in dev (the bug above meant
  nothing had ever successfully been written).
- Dropped the `auth.uid() = user_id` RLS policies (no longer meaningful against a `public.users` FK target; the
  API already enforces ownership at the application layer and connects via the service-role key, which bypasses
  RLS anyway). RLS stays enabled with no policy, as a default-deny safety net.
- Applied to dev and smoke-tested with a real `public.users` row (insert + delete succeeded).
