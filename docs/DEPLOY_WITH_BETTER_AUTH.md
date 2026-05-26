# Deploy API with Better Auth, Stage-Scoped Secrets, and Migrations

This guide matches the current live rollout:

- `dashboard-dev` owns the live testnet API/auth runtime
- `dashboard-prod` owns the live production API/auth runtime
- the backend `DATABASE_URL` comes from stage-scoped AWS Secrets Manager entries
- schema changes are previewed with `scripts/sync-db-migrations.sh --dry-run`
- schema changes are applied one file at a time with `scripts/sync-db-migrations.sh --file`

## Prerequisites

- Better Auth code deployed
- stage-scoped backend database secret created
- current migration reviewed
- Alternun AWS account configured

## Secrets Verification

Verify the stage secret that backs `INFRA_BACKEND_API_DATABASE_URL`:

```bash
source scripts/setup-aws-account.sh

SECRET_NAME="alternun/api/infra-backend-api-database-url-prod"

aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --query SecretString \
  --output text
```

Use `alternun/api/infra-backend-api-database-url-dev` for testnet and
`alternun/api/infra-backend-api-database-url-prod` for production.

## Deployment Methods

### Method 1: Recommended Live Flow

Preview the migration queue first:

```bash
bash scripts/sync-db-migrations.sh production --dry-run
```

Then apply only the reviewed migration file:

```bash
bash scripts/sync-db-migrations.sh production \
  --file supabase/migrations/20260424_0002_better_auth_user_identity_defaults.sql \
  --force-prod
```

Repeat for each reviewed migration file. Do not batch-apply the entire backlog unless you are doing an explicit recovery run.

After the migration file is applied, deploy the owning stack:

```bash
source scripts/setup-aws-account.sh
APPROVE=true STACK=dashboard-prod packages/infra/scripts/sst-deploy.sh
```

For testnet, use `dev` for the preview stack and `dashboard-dev` for the live API/auth runtime:

```bash
bash scripts/sync-db-migrations.sh dev --dry-run
APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh
```

### Method 2: Manual Deployment

```bash
source scripts/setup-aws-account.sh

export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/infra-backend-api-database-url-prod \
  --query SecretString \
  --output text)

APPROVE=true STACK=dashboard-prod packages/infra/scripts/sst-deploy.sh
```

Use the `-dev` secret and `STACK=dashboard-dev` for testnet.

### Method 3: Emergency Deploy Without Migrations

For hotfixes where you do not want to run migrations:

```bash
source scripts/setup-aws-account.sh

export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/infra-backend-api-database-url-prod \
  --query SecretString \
  --output text)

export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"

APPROVE=true STACK=dashboard-prod packages/infra/scripts/sst-deploy.sh
```

## Environment Variables

These are injected from the stage-scoped secret and deployment config:

| Variable                      | Source                           | Purpose                                 |
| ----------------------------- | -------------------------------- | --------------------------------------- |
| `DATABASE_URL`                | `INFRA_BACKEND_API_DATABASE_URL` | PostgreSQL connection to Supabase       |
| `RUN_MIGRATIONS`              | Deployment config                | Enable/disable migrations on cold start |
| `BETTER_AUTH_SECRET`          | Environment                      | Encryption key for Better Auth sessions |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Environment                      | CORS origins for auth endpoints         |

## Verification After Deploy

### 1. Check CloudWatch Logs

```bash
source scripts/setup-aws-account.sh

aws logs tail /aws/lambda/alternun-infra-dashboard-prod-nestjs-api --follow
```

For testnet, watch `/aws/lambda/alternun-infra-dashboard-dev-nestjs-api`.

### 2. Test Auth Endpoints

```bash
curl -k -i -X POST https://api.alternun.co/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -d '{
    "provider":"google",
    "callbackURL":"https://airs.alternun.co/auth/callback"
  }'

curl https://api.alternun.co/auth/get-session
```

For testnet, replace `api.alternun.co` with `testnet.api.alternun.co` and
`airs.alternun.co` with `testnet.airs.alternun.co`.

### 3. Verify Database Connection

```bash
source scripts/setup-aws-account.sh

psql "$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/infra-backend-api-database-url-prod \
  --query SecretString \
  --output text)" \
  -c "SELECT version, name, executed_at FROM _migrations ORDER BY version DESC;"
```

## Troubleshooting

### "DATABASE_URL not set" Error

```bash
source scripts/setup-aws-account.sh
aws secretsmanager get-secret-value \
  --secret-id alternun/api/infra-backend-api-database-url-prod
```

If the secret is missing, use the `-dev` or `-prod` stage-scoped name that matches the runtime you are deploying.

### Migration Queue Is Large

Do not batch-apply the queue. Preview first:

```bash
bash scripts/sync-db-migrations.sh production --dry-run
```

Then apply reviewed migrations one file at a time with `--file`.

### Auth Endpoints Return 500 Errors

1. Check CloudWatch logs for database connection errors
2. Verify `INFRA_BACKEND_API_DATABASE_URL` is populated from the correct stage secret
3. Confirm the reviewed migration file was applied
4. Test `POST /auth/sign-in/social` and `GET /auth/get-session`

### Connection Timeout

If deployment times out connecting to Supabase:

- verify outbound HTTPS to Supabase is allowed
- check firewall rules on Supabase if IP allow-listing is enabled
- retry the deploy after the stage secret is confirmed

## Rolling Back

If deployment breaks auth:

```bash
source scripts/setup-aws-account.sh

export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"

APPROVE=true STACK=dashboard-prod packages/infra/scripts/sst-deploy.sh
```

Do not batch-revert the database backlog without reviewing the current migration state first.

## Next Steps

- [ ] Run `bash scripts/sync-db-migrations.sh production --dry-run`
- [ ] Apply the reviewed migration files one at a time
- [ ] Deploy `dashboard-prod` or `dashboard-dev`
- [ ] Test `POST /auth/sign-in/social` and `GET /auth/get-session`
- [ ] Monitor API health after deploy
- [ ] Add new migrations through `docs/DATABASE_MIGRATIONS.md`
