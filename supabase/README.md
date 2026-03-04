# Supabase Wallet Schema

Run migration:

- [20260303_0001_create_user_wallets.sql](/home/ed/Documents/Alternun/alternun/supabase/migrations/20260303_0001_create_user_wallets.sql)

This creates `public.user_wallets` with:

- one-to-many wallet registry per `auth.users.id`
- deduplicated wallet identities
- primary-wallet enforcement per user
- RLS policies so users can only read/write their own wallets

## How to apply

1. Open Supabase SQL Editor for your project.
2. Run the migration SQL file contents.
3. Verify:
   - table exists: `public.user_wallets`
   - RLS enabled
   - policies created (`user_wallets_select_own`, `insert_own`, `update_own`, `delete_own`)

