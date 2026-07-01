# Production Database State

Last updated: 2026-06-29

## Overview

The production Supabase database (`aws-1-us-east-1.pooler.supabase.com`) was originally
provisioned manually before the migration runner was introduced. This means some tables
and columns were created outside of the migration history, causing schema drift between
what the migration files describe and what actually exists in production.

This document records the current state, migration history, and known schema differences.

---

## Migration Runner

Migrations are tracked in the `public._migrations` table:

- **Schema**: `id SERIAL, name VARCHAR(255), version VARCHAR(50), executed_at TIMESTAMPTZ`
- **Runner**: `apps/api/scripts/apply-migrations.ts` (batch), `apps/api/scripts/run-migration.mjs` (single file)
- **Apply command**: `bash scripts/sync-db-migrations.sh production --file <path> --force-prod`

---

## Applied Migrations (as of 2026-06-29)

All 52 migration files in `supabase/migrations/` are now recorded in `_migrations`.

| Version       | Name                                      | Status                       | Notes                                                                                                                                                  |
| ------------- | ----------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 20260303_0001 | create_user_wallets                       | ✅ applied                   |                                                                                                                                                        |
| 20260304_0002 | create_user_profiles_and_wallet_events    | ✅ applied                   |                                                                                                                                                        |
| 20260319_0003 | create_app_users                          | ✅ applied                   | `CREATE TABLE IF NOT EXISTS` — table already existed; column definitions skipped                                                                       |
| 20260320_0004 | link_wallets_to_app_users                 | ✅ applied                   |                                                                                                                                                        |
| 20260321_0005 | sync_auth_users_to_app_users              | ⚠️ partial                   | Trigger + function created; backfill INSERT failed — `users_sub_iss_uq` unique constraint not present on pre-existing table                            |
| 20260321_0006 | add_raw_claims_column                     | ✅ applied                   | Patch: added missing `raw_claims jsonb` column (was absent from pre-existing users table)                                                              |
| 20260417_0006 | create_airs_accumulation                  | ✅ applied                   | Added `airs_balance`, `airs_lifetime_earned` to users; created `airs_ledger_entries`, ledger RPC functions                                             |
| 20260417_0007 | add_airs_dashboard_snapshot               | ✅ applied                   | `airs_get_dashboard_snapshot(uuid,...)` RPC                                                                                                            |
| 20260417_0008 | create_airs_wallet_tables                 | ✅ applied                   | `wallet_accounts`, `wallet_events` tables                                                                                                              |
| 20260417_0009 | create_better_auth_tables                 | 🔇 skipped in code           | Superseded by later schema; `skippedMigrationVersions` in apply-migrations.ts                                                                          |
| 20260417_0010 | fix_better_auth_schema                    | 🔇 skipped in code           | Superseded; `skippedMigrationVersions`                                                                                                                 |
| 20260417_0011 | better_auth_uuid_schema                   | 🚫 skipped — DANGEROUS       | Contains `DROP TABLE users CASCADE`. Marked applied in `_migrations` without executing.                                                                |
| 20260418_0001 | better_auth_schema                        | 🚫 skipped — schema conflict | `CREATE TABLE IF NOT EXISTS users (id TEXT)` conflicts with prod UUID schema. Marked applied.                                                          |
| 20260418_0002 | fix_user_id_type                          | 🚫 skipped — DANGEROUS       | Contains `DROP TABLE users CASCADE`. Marked applied in `_migrations` without executing.                                                                |
| 20260419_0001 | add_supabase_auth_columns                 | ✅ applied                   | Added `aud`, `picture`, `phone`, `phone_verified`, `confirmation_sent_at`, `last_sign_in_at` to users                                                  |
| 20260419_0002 | auth_sync_triggers                        | ✅ applied                   | Auth sync trigger functions                                                                                                                            |
| 20260422_0003 | bidirectional_auth_user_sync              | ⚠️ partial                   | Triggers created; backfill INSERT failed — Better Auth IDs are not UUIDs, cannot cast to `users.id uuid`                                               |
| 20260422_0004 | public_users_better_auth_identity         | ✅ applied                   |                                                                                                                                                        |
| 20260422_0005 | public_users_better_auth_trigger          | ✅ applied                   |                                                                                                                                                        |
| 20260422_0006 | public_users_fill_better_auth_identity    | ✅ applied                   |                                                                                                                                                        |
| 20260422_0007 | public_users_skip_non_uuid_auth_sync      | ✅ applied                   |                                                                                                                                                        |
| 20260422_0008 | public_users_fill_better_auth_identity_id | ✅ applied                   |                                                                                                                                                        |
| 20260422_0009 | public_users_delete_auth_user             | ✅ applied                   |                                                                                                                                                        |
| 20260422_0010 | public_users_reuse_existing_auth_identity | ✅ applied                   |                                                                                                                                                        |
| 20260422_0011 | backfill_public_users_into_auth_users     | ✅ applied                   |                                                                                                                                                        |
| 20260422_0012 | create_referrals_table                    | ✅ applied                   |                                                                                                                                                        |
| 20260422_0013 | auth_users_source_of_truth                | ⚠️ partial                   | `ALTER TABLE ADD COLUMN` + DROP TRIGGER succeeded; backfill INSERT failed — `auth.users.id::text` cannot satisfy `ON CONFLICT (id)` on a `uuid` column |
| 20260424_0001 | better_auth_id_defaults                   | ✅ applied                   | (applied via earlier run)                                                                                                                              |
| 20260424_0002 | better_auth_user_identity_defaults        | ✅ applied                   |                                                                                                                                                        |
| 20260424_0003 | better_auth_session_request_columns       | ✅ applied                   |                                                                                                                                                        |
| 20260425_0001 | airs_registration_bonus                   | ✅ applied                   | `airs_award_registration_bonus` RPC                                                                                                                    |
| 20260425_0002 | signup_welcome_email_flag                 | ✅ applied                   | `signup_welcome_email_sent` column on users                                                                                                            |
| 20260425_0003 | registration_bonus_tracking               | ✅ applied                   | `registration_bonus_claimed` column on users                                                                                                           |
| 20260425_0004 | welcome_email_tracking                    | ✅ applied                   | `welcome_email_sent`, `welcome_email_sent_at` columns on users                                                                                         |
| 20260426_0001 | create_user_achievements                  | ✅ applied                   | `user_achievements` table                                                                                                                              |
| 20260426_0002 | fix_airs_text_user_id_overloads           | ✅ applied                   | Text overloads for AIRS RPCs                                                                                                                           |
| 20260426_0003 | fix_airs_uuid_functions_for_text_users    | ✅ applied                   |                                                                                                                                                        |
| 20260426_0004 | fix_airs_ledger_idempotency_upsert        | ✅ applied                   |                                                                                                                                                        |
| 20260426_0005 | fix_airs_apply_ledger_entry_text_user_id  | ✅ applied                   |                                                                                                                                                        |
| 20260426_0006 | referral_codes_and_attribution            | ✅ applied                   | `referral_code`, `referred_by_user_id`, `referred_by_referral_code` on users; `referrals` table extended                                               |
| 20260426_0007 | referral_codes_slug_suffix                | ✅ applied                   |                                                                                                                                                        |
| 20260503_0001 | auth_referral_attribution                 | ✅ applied                   |                                                                                                                                                        |
| 20260503_0002 | referral_slug_fallback_attribution        | ✅ applied                   |                                                                                                                                                        |
| 20260504_0001 | referral_confirmation_tracking            | ✅ applied                   |                                                                                                                                                        |
| 20260626_0001 | airs_leaderboard_and_referral_bonus       | ✅ applied                   | `airs_get_leaderboard`, `airs_award_referral_bonus` RPCs                                                                                               |
| 20260626_0002 | user_country_city_and_positions           | ✅ applied                   | `country`, `city` columns on users; `airs_update_user_profile`, `airs_get_user_positions` RPCs                                                         |
| 20260626_0003 | leaderboard_full_names                    | ✅ applied                   | Updated leaderboard display name logic                                                                                                                 |
| 20260626_0004 | drop_uuid_overloads_fix_pgrst203          | ✅ applied                   | Dropped UUID overloads; fixed PGRST203 ambiguity on 5 AIRS RPCs                                                                                        |
| 20260626_0005 | fix_dashboard_visit_user_id_ambiguity     | ✅ applied                   | Fixed `airs_record_dashboard_visit` variable conflict                                                                                                  |
| 20260626_0006 | default_country_city_colombia_medellin    | ✅ applied                   | Default country/city backfill                                                                                                                          |
| 20260627_0001 | mark_incompatible_migrations_as_applied   | ✅ applied                   | Marker migration recording the 6 skipped/partial migrations above                                                                                      |
| 20260629_0001 | airs_eligible_users_count                 | ✅ applied                   | Added `airs_get_eligible_users_count()` RPC                                                                                                            |
| 20260629_0002 | wallet_encrypted_seeds                    | ✅ applied                   | Added wallet seed/encryption tables + PIN lockout columns (device-only recovery task uses the wallet tables, the seed table remains deferred)          |

---

## Known Schema Differences from Migration Files

The production `public.users` table was created before the migration runner and differs from `20260319_0003_create_app_users.sql` in the following ways:

| Column             | Migration expects                            | Production state                                                         |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| `id`               | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | Present ✅                                                               |
| `sub`              | `text NOT NULL`                              | May be missing or nullable — unique constraint `users_sub_iss_uq` absent |
| `iss`              | `text NOT NULL`                              | Same as above                                                            |
| `users_sub_iss_uq` | `UNIQUE (sub, iss)`                          | **ABSENT** — this is why 0321_0005 backfill failed                       |
| `raw_claims`       | `jsonb NOT NULL DEFAULT '{}'`                | Added by 20260321_0006 ✅                                                |

### Impact of `users_sub_iss_uq` absence

- Migration `20260321_0005` backfill cannot run (uses `ON CONFLICT (sub, iss)`)
- The auth sync trigger (`sync_auth_user_to_app_users`) uses `ON CONFLICT (sub, iss)` — new Supabase auth signups will fail until this constraint is added
- Migration `20260422_0013` backfill also uses `ON CONFLICT (id)` but with a text/uuid type mismatch

### Fix required (future work)

To fully resolve:

```sql
-- 1. Ensure sub/iss are NOT NULL (backfill first)
UPDATE public.users SET sub = id::text WHERE sub IS NULL;
UPDATE public.users SET iss = 'supabase' WHERE iss IS NULL;

-- 2. Add the missing unique constraint
ALTER TABLE public.users
  ALTER COLUMN sub SET NOT NULL,
  ALTER COLUMN iss SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_sub_iss_uq ON public.users (sub, iss);
ALTER TABLE public.users ADD CONSTRAINT users_sub_iss_uq UNIQUE USING INDEX users_sub_iss_uq;
```

---

## AIRS API RPC Functions (current in prod)

| Function                              | Signature                                                                       | Status  |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| `airs_record_dashboard_visit`         | `(p_user_id text, p_locale text, p_metadata jsonb)`                             | ✅ live |
| `airs_get_dashboard_snapshot`         | `(p_user_id text, p_locale text, p_ledger_limit int)`                           | ✅ live |
| `airs_award_registration_bonus`       | `(p_user_id text, p_bonus_amount numeric)`                                      | ✅ live |
| `airs_award_profile_completion_bonus` | `(p_user_id text, p_bonus_amount numeric, p_source_ref text, p_metadata jsonb)` | ✅ live |
| `airs_mark_welcome_email_sent`        | `(p_user_id text, p_locale text, p_metadata jsonb)`                             | ✅ live |
| `airs_get_leaderboard`                | `(p_requesting_user_id text, p_limit int)`                                      | ✅ live |
| `airs_get_user_positions`             | `(p_user_id text)`                                                              | ✅ live |
| `airs_update_user_profile`            | `(p_user_id text, p_name text, p_country text, p_city text)`                    | ✅ live |
| `airs_award_referral_bonus`           | `(p_referrer_user_id text, p_referred_user_id text, p_bonus_amount numeric)`    | ✅ live |
| `airs_get_eligible_users_count`       | `()`                                                                            | ✅ live |

---

## Dangerous Migrations — Never Apply to Production

| File                                        | Reason                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `20260417_0011_better_auth_uuid_schema.sql` | `DROP TABLE IF EXISTS "users" CASCADE` — destroys all user data |
| `20260418_0002_fix_user_id_type.sql`        | `DROP TABLE IF EXISTS users CASCADE` — destroys all user data   |

Both are permanently blocked via:

1. `skippedMigrationVersions` in `apps/api/scripts/apply-migrations.ts`
2. Records in `public._migrations` so `--file` mode also skips them

---

## Future Migration Protocol

When writing new migrations that touch `public.users`:

1. Always use `ADD COLUMN IF NOT EXISTS` — the table pre-dates the migration runner
2. Never use `ON CONFLICT (sub, iss)` until the missing unique constraint is added (see Fix required above)
3. Do not use `DROP TABLE` or `ALTER COLUMN ... SET NOT NULL` without a covering `UPDATE` first
4. Test against the actual production schema (see columns above), not just the migration file baseline
