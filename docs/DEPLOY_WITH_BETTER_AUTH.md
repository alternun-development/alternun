# Deploy API with Better Auth & Migrations

Complete deployment guide for Better Auth with Supabase PostgreSQL and automated migrations.

## Prerequisites

- ✅ Better Auth code deployed
- ✅ DATABASE_URL stored in AWS Secrets (`alternun/api/database-url`)
- ✅ Better Auth migration applied to Supabase
- ✅ Alternun AWS account configured

## Secrets Verification

Verify DATABASE_URL is in AWS Secrets Manager:

```bash
source scripts/setup-aws-account.sh

# Check secret exists
aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text
```

**Output should show:** `postgresql://postgres:...@db.rjebeugdvwbjpaktrrbx.supabase.co:5432/postgres`

## Deployment Methods

### Method 1: Quick Deploy (Recommended)

```bash
# One command deploys with DATABASE_URL from Secrets Manager
bash scripts/deploy-with-migrations.sh
```

### Method 2: Manual Deployment

```bash
# Load Alternun credentials
source scripts/setup-aws-account.sh

# Get DATABASE_URL from Secrets Manager
export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text)

# Deploy with migrations enabled (default)
APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

### Method 3: Deploy Without Migrations (Emergency)

For hotfixes where you don't want to run migrations:

```bash
source scripts/setup-aws-account.sh

export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text)

# Disable migrations
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"

APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

## Environment Variables

These are automatically loaded from AWS Secrets and passed to Lambda:

| Variable                      | Source              | Purpose                                 |
| ----------------------------- | ------------------- | --------------------------------------- |
| `DATABASE_URL`                | AWS Secrets Manager | PostgreSQL connection to Supabase       |
| `RUN_MIGRATIONS`              | Deployment config   | Enable/disable migrations on cold start |
| `BETTER_AUTH_SECRET`          | Environment         | Encryption key for Better Auth sessions |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Environment         | CORS origins for auth endpoints         |

## Verification After Deploy

### 1. Check CloudWatch Logs

```bash
source scripts/setup-aws-account.sh

# View Lambda logs
aws logs tail /aws/lambda/alternun-api-dev --follow
```

**Look for migration logs:**

```
[migrations] Found 1 pending migration(s)
[migrations] Applying: 20260417_0001_create_better_auth_tables
[migrations] All 1 migration(s) applied
```

### 2. Test Auth Endpoints

```bash
# Test sign-in
curl -X POST https://testnet.api.alternun.co/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'

# Expected: 200 OK with session token

# Test get-session
curl https://testnet.api.alternun.co/auth/get-session

# Expected: 200 OK with user session from database
```

### 3. Verify Database Connection

```bash
source scripts/setup-aws-account.sh

# Connect to Supabase and check migration table
psql "$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString \
  --output text)" \
  -c "SELECT version, name, executed_at FROM _migrations ORDER BY version DESC;"
```

**Expected output:**

```
        version        |            name             |       executed_at
-----------------------+-----------------------------+------------------------
 20260417_0001         | create_better_auth_tables   | 2026-04-17 23:45:12+00
```

## Troubleshooting

### "DATABASE_URL not set" Error

```bash
# Verify secret exists and is readable
source scripts/setup-aws-account.sh
aws secretsmanager get-secret-value --secret-id alternun/api/database-url
```

### Migration Failed: "table already exists"

Safe to ignore—migrations use `IF NOT EXISTS` and are idempotent. Re-run deploy.

### Auth endpoints return 500 errors

1. Check CloudWatch logs for database connection errors
2. Verify DATABASE_URL in Lambda environment (AWS Lambda console)
3. Confirm Better Auth migration was applied to Supabase
4. Check Supabase tables exist: `users`, `accounts`, `sessions`, `verifications`

### Connection Timeout

If deployment times out connecting to Supabase:

- Verify VPC/security groups allow outbound HTTPS to Supabase
- Check firewall rules on Supabase (if IP whitelisting enabled)
- Retry deployment—temporary network issues are common

## Rolling Back (Emergency)

If deployment breaks auth:

```bash
source scripts/setup-aws-account.sh

# Deploy previous version WITHOUT running migrations
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"

# Use previous database snapshot or revert last migration
git revert <commit-hash>

# Redeploy
bash scripts/deploy-with-migrations.sh
```

## Next Steps

- [ ] Run first deployment with `bash scripts/deploy-with-migrations.sh`
- [ ] Verify logs in CloudWatch show migration success
- [ ] Test auth endpoints (sign-in, get-session)
- [ ] Monitor API health for 24 hours
- [ ] Add new migrations as needed (go to [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md))
