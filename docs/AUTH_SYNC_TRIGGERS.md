# Auth Sync Triggers

This document explains the triggers that sync Supabase auth users into the app-facing tables.

## Overview

When users sign up or update their profile in Supabase auth (`auth.users`), triggers automatically sync that data to the app-facing tables:

- `public.users` - application mirror of `auth.users`
- `public.user_profiles` - user profile information

The current dev setup also includes a one-time backfill migration for older
`auth.users` rows that were created before the mirror triggers stabilized.

## Triggers

### 1. `trg_auth_users_sync_to_app_users`

**Fires on:** INSERT or UPDATE of `auth.users`
**Conditions:** Skips anonymous users
**Syncs to:** `public.users`

**Maps these fields:**
| auth.users | public.users |
|------------|--------------|
| `id` | `id` (text primary key) |
| `raw_app_meta_data->>'aud'` or `authenticated` | `aud` |
| `email` | `email` |
| `email_confirmed_at IS NOT NULL` | `email_verified` |
| `raw_user_meta_data->>'name'` or `full_name` or email prefix | `name` |
| `raw_user_meta_data->>'avatar_url'` or `picture` | `image` and `picture` |
| `phone` | `phone` |
| `phone_confirmed_at IS NOT NULL` | `phone_verified` |
| `confirmation_sent_at` | `confirmation_sent_at` |
| `last_sign_in_at` | `last_sign_in_at` |

**Conflict resolution:** ON CONFLICT (id) - updates if user already exists

### 2. `trg_auth_users_create_profile`

**Fires on:** INSERT on `auth.users`
**Syncs to:** `public.user_profiles`

**Maps these fields:**
| auth.users | user_profiles |
|------------|--------------|
| `id` | `user_id` |
| `email` | `email` |
| `raw_user_meta_data->>'name'` or `full_name` or email prefix | `display_name` |
| `raw_user_meta_data->>'avatar_url'` | `avatar_url` |
| `raw_app_meta_data->>'provider'` or default 'supabase' | `idp_provider` |
| `raw_app_meta_data->>'provider_id'` or `id` | `idp_subject` |
| `raw_user_meta_data` (full JSONB) | `metadata` |

**Conflict resolution:** ON CONFLICT (user_id) - updates if profile already exists

## Data Flow

```
Supabase auth.users insert/update
           ↓
  sync_auth_user_to_app_users()
           ↓
public.users ───────────────→ public.user_profiles
```

## Important Notes

- `auth.users` is the source of truth for signup
- `public.users` is the application mirror
- Triggers use `SECURITY DEFINER` to ensure they can write even if row-level security is enabled
- Anonymous users are skipped (trigger returns early)
- Both triggers use `ON CONFLICT ... DO UPDATE` to handle re-runs safely
- Triggers automatically set `updated_at` timestamp
- A backfill migration copies missing `auth.users` rows into `public.users`
  so sign-in can resolve them immediately

## Maintenance

If you modify the trigger functions:

1. Edit them in the migration file: `supabase/migrations/20260422_0013_auth_users_source_of_truth.sql`
2. Create a new migration with `ALTER OR REPLACE FUNCTION` or `DROP TRIGGER IF EXISTS` + recreate
3. Run `pnpm run db:migrate` to apply

## Debugging

To test the sync:

```bash
# Sign up via API
curl -X POST http://localhost:8082/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!"}'

# Check public.users was synced
SELECT id, email, aud, email_verified FROM public.users
WHERE email='test@example.com';

# Check user_profiles was created
SELECT user_id, email, display_name FROM public.user_profiles
WHERE email='test@example.com';
```
