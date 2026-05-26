# Deploy Better Auth with Supabase

This is the current stage-aware deployment path for the API/auth runtime.
Use `dashboard-dev` for testnet and `dashboard-prod` for production.

## Prerequisites

- Better Auth code deployed to the owning API stack
- stage-scoped backend database secret configured
- current migration reviewed

## Steps to Complete Deployment

### 1. Preview or Apply Migrations

Prefer the repo migration wrapper instead of manual SQL editor changes:

```bash
bash scripts/sync-db-migrations.sh dev --dry-run
bash scripts/sync-db-migrations.sh production --dry-run
```

To apply one reviewed file:

```bash
bash scripts/sync-db-migrations.sh production \
  --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql \
  --force-prod
```

Use `--file` for one migration at a time. Use `--all` only for a deliberate recovery run.

### 2. Deploy the Owning Stack

```bash
source scripts/setup-aws-account.sh
APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh
```

For production, switch to `STACK=dashboard-prod`.

### 3. Verify Auth Works

```bash
curl -k -i -X POST https://testnet.api.alternun.co/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","callbackURL":"https://testnet.airs.alternun.co/auth/callback"}'

curl https://testnet.api.alternun.co/auth/get-session
```

Sessions should persist to Supabase instead of memory, and the Google redirect URI should stay on the API origin.

## Troubleshooting

**Issue: Auth endpoints still return 500 errors**

- Verify the reviewed migration file ran successfully
- Check that the expected tables exist in `public`
- Confirm `INFRA_BACKEND_API_DATABASE_URL` is set in the Lambda environment from the correct stage secret

**Issue: Migration fails with "table already exists"**

- The migration may already be applied
- Re-run `scripts/sync-db-migrations.sh <stage> --dry-run` before applying anything else

**Issue: Can't connect to Supabase**

- Verify the stage-scoped `alternun/api/infra-backend-api-database-url-dev` or `-prod` secret
- Check network connectivity from the runtime
