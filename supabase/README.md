# Supabase Wallet Schema

Run migration:

- [20260303_0001_create_user_wallets.sql](/home/ed/Documents/Alternun/alternun/supabase/migrations/20260303_0001_create_user_wallets.sql)
- [20260304_0002_create_user_profiles_and_wallet_events.sql](/home/ed/Documents/Alternun/alternun/supabase/migrations/20260304_0002_create_user_profiles_and_wallet_events.sql)

This creates `public.user_wallets` with:

- one-to-many wallet registry per `auth.users.id`
- deduplicated wallet identities
- primary-wallet enforcement per user
- RLS policies so users can only read/write their own wallets

And extends auth schema with:

- `public.user_profiles` (1:1 with `auth.users`, with auto-backfill + auto-create trigger)
- `public.user_wallet_events` (audit log for wallet link/usage/update/unlink events)
- RLS policies so users can only read/update their own profile and read own wallet events

## How to apply

1. Open Supabase SQL Editor for your project.
2. Run the migration SQL file contents.
3. Verify:
   - table exists: `public.user_wallets`
   - table exists: `public.user_profiles`
   - table exists: `public.user_wallet_events`
   - RLS enabled
   - policies created (`user_wallets_select_own`, `insert_own`, `update_own`, `delete_own`)
   - policies created (`user_profiles_select_own`, `user_profiles_update_own`, `user_wallet_events_select_own`)
