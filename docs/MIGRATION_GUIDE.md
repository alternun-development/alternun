# Better Auth Supabase Migration

## Apply Better Auth Tables Migration

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**

   - Go to: https://app.supabase.com
   - Select your "alternun" project

2. **Open SQL Editor**

   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste Migration**

   - Copy the contents of `supabase/migrations/20260417_0009_create_better_auth_tables.sql`
   - Paste into the SQL Editor

4. **Execute**

   - Click "Run" button (or Cmd+Enter)
   - Wait for "SUCCESS" message

5. **Verify**
   - Check that these tables exist in the "Tables" section:
     - `public.users`
     - `public.accounts`
     - `public.sessions`
     - `public.verifications`

### Option 2: Supabase CLI

```bash
# Requires: supabase CLI installed and linked to your project
supabase db push --linked
```

### Option 3: During Deployment

Migrations are automatically applied when deploying to testnet via:

```bash
bash scripts/setup-aws-account.sh && APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

---

## Verification

After migration is applied, the Better Auth tables will persist:

- User accounts
- OAuth sessions and tokens
- Email verification codes

Sessions no longer disappear on API restart.
