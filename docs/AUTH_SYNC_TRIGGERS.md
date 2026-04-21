# Auth Sync Triggers

This document explains the triggers that sync Supabase auth users to our custom application tables.

## Overview

When users sign up or update their profile in Supabase auth (`auth.users`), triggers automatically sync that data to our application tables:

- `public.users` - canonical user table with auth claims
- `public.user_profiles` - user profile information

## Triggers

### 1. `trg_auth_users_sync_to_app_users`

**Fires on:** INSERT or UPDATE of `auth.users`
**Conditions:** Skips anonymous users
**Syncs to:** `public.users`

**Maps these fields:**
| auth.users | public.users |
|------------|--------------|
| `id` | `id` (primary key) |
| `id` (cast to UUID) | `sub` (JWT subject claim) |
| literal `'supabase'` | `iss` (JWT issuer claim) |
| `email` | `email` |
| `email_confirmed_at IS NOT NULL` | `email_verified` |
| `raw_user_meta_data->>'name'` or `full_name` or email prefix | `name` |
| `raw_user_meta_data->>'avatar_url'` | `picture` |

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
Supabase Login Flow (email/password)
           ↓
    POST /auth/sign-up/email
           ↓
  Supabase creates user in auth.users
           ↓
  Triggers fire automatically
           ↓
  ┌─────────┴──────────┐
  ↓                    ↓
public.users      public.user_profiles
(source of truth)  (profile metadata)
```

## Important Notes

- **public.users is the source of truth** for user identity
- Triggers use `SECURITY DEFINER` to ensure they can write even if row-level security is enabled
- Anonymous users are skipped (trigger returns early)
- Both triggers use `ON CONFLICT ... DO UPDATE` to handle re-runs safely
- Triggers automatically set `updated_at` timestamp

## Maintenance

If you modify the trigger functions:

1. Edit them in the migration file: `supabase/migrations/20260419_0002_auth_sync_triggers.sql`
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
SELECT id, email, sub, iss FROM public.users
WHERE email='test@example.com';

# Check user_profiles was created
SELECT user_id, email, display_name FROM public.user_profiles
WHERE email='test@example.com';
```
