# Deploy Better Auth with Supabase

## Prerequisites

- Better Auth code deployed to testnet API
- Supabase project linked
- DATABASE_URL configured

## Steps to Complete Deployment

### 1. Apply Database Migration (Choose One)

#### Option A: Supabase Dashboard (Fastest)

1. Go to https://app.supabase.com → Your Project
2. Click **SQL Editor** → **New Query**
3. Copy & paste contents of `supabase/migrations/20260417_0009_create_better_auth_tables.sql`
4. Click **Run**
5. Verify tables created: `users`, `accounts`, `sessions`, `verifications`

#### Option B: Supabase CLI (Requires Linking)

```bash
# Link project to Supabase account
pnpm exec supabase link --project-ref rjebeugdvwbjpaktrrbx

# Push migrations
pnpm exec supabase db push
```

#### Option C: During AWS Deployment (From Lambda)

When deploying API to testnet, migrations run automatically:

```bash
bash scripts/setup-aws-account.sh
APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh

# Then run migrations on deployed Lambda
aws lambda invoke \
  --function-name alternun-api-dev \
  --payload '{"action":"migrate"}' \
  response.json
```

### 2. Deploy API to Testnet

```bash
bash scripts/setup-aws-account.sh
APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

### 3. Verify Auth Works

```bash
# Test sign-in endpoint
curl -X POST https://testnet.api.alternun.co/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test get-session endpoint
curl https://testnet.api.alternun.co/auth/get-session
```

Sessions should now persist to Supabase database instead of memory.

## Troubleshooting

**Issue: Auth endpoints still return 500 errors**

- Verify migration ran successfully in Supabase dashboard
- Check that tables exist: `public.users`, `public.accounts`, `public.sessions`, `public.verifications`
- Confirm DATABASE_URL is set in API environment

**Issue: Migration fails with "table already exists"**

- Tables are already created (idempotent migration handles this with IF NOT EXISTS)
- Safe to retry

**Issue: Can't connect to Supabase**

- Verify DATABASE_URL in `.env` or AWS Secrets
- Check network connectivity (AWS Lambda has access, local dev may not)
