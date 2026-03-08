# @alternun/infra

AWS/SST deployment wrapper for Alternun Expo Web using `@lsts_tech/infra`.

## Stage Domains

- `production` -> `airs.alternun.co`
- `dev` -> `testnet.airs.alternun.co`
- `mobile` (optional) -> `preview.airs.alternun.co`

## Identity Infrastructure

Authentik infrastructure is wired into the stack and remains disabled by default.

When `INFRA_IDENTITY_ENABLED=true`, the stack now provisions:

- a dedicated VPC for identity resources
- a public EC2 host for Authentik runtime bootstrap
- a PostgreSQL RDS instance in VPC subnets
- Route53 DNS for the stage-specific identity domain
- Secrets Manager entries for:
  - Authentik secret key
  - database credentials
  - SMTP credentials placeholder
  - JWT signing key

Current default identity domains:

- `production` -> `auth.alternun.co`
- `dev` -> `auth.testnet.alternun.co`
- `mobile` -> `auth.preview.alternun.co`

Enable/configure through env or local config:

- `INFRA_IDENTITY_ENABLED`
- `INFRA_IDENTITY_DOMAIN_PRODUCTION`
- `INFRA_IDENTITY_DOMAIN_DEV`
- `INFRA_IDENTITY_DOMAIN_MOBILE`
- `INFRA_IDENTITY_EC2_INSTANCE_TYPE`
- `INFRA_IDENTITY_RDS_INSTANCE_TYPE`
- `INFRA_IDENTITY_EMAIL_PROVIDER`
- `INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG` (calendar-version tag, `>= 2025.10`)
- `INFRA_IDENTITY_JWT_AUDIENCE`
- `INFRA_IDENTITY_JWT_ROLE_CLAIM`
- `INFRA_IDENTITY_JWT_ROLES_CLAIM`
- `INFRA_ENABLE_EXPO_SITE` (set `false` on dedicated identity stacks to skip Expo/static-site resources)

Important behavior:

- secret names are automatically stage-scoped on creation to avoid dev/production collisions
- Authentik image tag is validated to calendar-version format and must be `>= 2025.10` (Redisless baseline)
- identity deployment can be stage-scoped with `INFRA_IDENTITY_ENABLED_STAGES` (for example `dev` to keep production untouched)
- the identity VPC does not create NAT by default, keeping the baseline cost lean
- the EC2 host bootstraps Docker + Traefik + Authentik (server/worker) at startup using Secrets Manager values and no Redis
- SST outputs now expose the provisioned identity instance, database, VPC, DNS, and secret metadata
- identity pipelines deploy on isolated stacks (`identity-dev`, `identity-prod`) and force `INFRA_ENABLE_EXPO_SITE=false`, so they do not build/deploy or modify the app site stack

### Identity-Only IaC Provisioning

Deploy identity infrastructure without touching Expo/site resources:

Use dedicated identity stacks. Do not run identity-only toggles against `dev` or `production` stacks, or Pulumi will plan deletions for resources not declared in that run.

Fail-safe guardrails are enforced in both IaC and CI:

- `INFRA_ENABLE_EXPO_SITE=false` is rejected for non-identity stack stages
- only `identity-dev` / `identity-prod` style stages can run identity-only mode

```bash
INFRA_IDENTITY_ENABLED=true \
INFRA_IDENTITY_ENABLED_STAGES=dev \
pnpm --filter @alternun/infra run deploy:identity-dev
```

For production identity:

```bash
INFRA_IDENTITY_ENABLED=true \
INFRA_IDENTITY_ENABLED_STAGES=production \
pnpm --filter @alternun/infra run deploy:identity-prod
```

These commands remain fully IaC-driven from `packages/infra/infra.config.ts` and `packages/infra/modules/identity-resources.ts`.

## Redirects (Dev Stage)

During `dev` deployments, infra can provision:

- `airs.alternun.co` -> `testnet.airs.alternun.co`
- `dev.airs.alternun.co` -> `testnet.airs.alternun.co`
- `alternun.co` -> `alternun.io`

Config knobs:

- `INFRA_REDIRECT_AIRS_TO_DEV`
- `INFRA_REDIRECT_AIRS_TO_DEV_SOURCE`
- `INFRA_REDIRECT_AIRS_TO_DEV_CERT_ARN` (optional)
- `INFRA_REDIRECT_DEV_TO_TESTNET`
- `INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE`
- `INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN` (optional)
- `INFRA_REMOVE_ACM_VALIDATION_CNAME` (auto-cleans `_*.domain` ACM CNAME records when DNS auto-remove is enabled)
- `INFRA_REDIRECT_ROOT_DOMAIN`
- `INFRA_REDIRECT_ROOT_TARGET`
- `INFRA_REDIRECT_ROOT_CERT_ARN` (optional)

## Why This Package Exists

- Keeps infrastructure code isolated in one workspace package.
- Uses a public reusable orchestrator (`@lsts_tech/infra`).
- Keeps business-specific values out of git by supporting a local config file.

## Local Config (Not Committed)

1. Copy example:

```bash
cp config/deployment.config.example.json config/deployment.config.json
```

2. Optionally point to a custom path:

```bash
export INFRA_CONFIG_PATH=./packages/infra/config/deployment.config.json
```

Environment variables always override local JSON values.

## Branch Sync

Run only from a clean working tree:

```bash
pnpm --filter @alternun/infra run sync:master-develop
```

Current testnet mode uses `master -> develop` as the fast-forward direction.

This script does a fast-forward-only sync:

1. fetches `master` and `develop`
2. fast-forwards `develop` from `master`
3. pushes `develop`

The legacy promotion helper still exists:

```bash
pnpm --filter @alternun/infra run sync:develop-master
```

Use it only when testnet mode is disabled and the traditional `develop -> master` release flow is restored.

## Deploy

From repo root:

```bash
pnpm --filter @alternun/infra run deploy:dev
pnpm --filter @alternun/infra run deploy:production
pnpm --filter @alternun/infra run deploy:identity-dev
pnpm --filter @alternun/infra run deploy:identity-prod
```

These commands are env-first and enforced:

- they load `packages/infra/.env` and (when enabled) repo root `.env`
- they map legacy keys (`AWS_KEY_ID`/`AWS_SECRET_KEY`) to AWS standard env vars
- they validate AWS account ownership (`INFRA_AWS_ACCOUNT_ID`)
- they validate Route53 hosted zone ownership for `INFRA_ROOT_DOMAIN`
- they fail fast before `sst deploy` when context is wrong

Do not run raw `sst deploy` directly for normal deployments.

Recommended local flags in `packages/infra/.env`:

- `INFRA_LOAD_ROOT_ENV=true`
- `INFRA_FORCE_ENV_AWS_CREDENTIALS=true`
- `INFRA_REQUIRE_ENV_AWS_CREDENTIALS=true`

For CI/CodeBuild, keep:

- `INFRA_FORCE_ENV_AWS_CREDENTIALS=false`
- `INFRA_REQUIRE_ENV_AWS_CREDENTIALS=false`

## Secrets Sync

Sync stage secrets used by infra/web auth variables:

```bash
pnpm --filter @alternun/infra run ensure:secrets -- dev
```

The script reads `packages/infra/.env` and sets:

- `ExpoPublicSupabaseUrl`
- `ExpoPublicSupabaseKey`
- `ExpoPublicWalletConnectProjectId` (if present)
- `ExpoPublicWalletConnectChainId` (if present)

## Pipelines

Create/repair configured pipelines:

```bash
APPROVE=true pnpm --filter @alternun/infra run ensure:pipelines
```

`INFRA_PIPELINES` supports these targets:

- `production`
- `dev`
- `mobile`
- `identity-dev` (Authentik-focused pipeline for `SST_STAGE=identity-dev`, defaults to `develop` branch)
- `identity-prod` (Authentik-focused pipeline for `SST_STAGE=identity-prod`, defaults to `master` branch)

Legacy alias: `identity` maps to `identity-dev`.
Created pipeline names are `alternun-auth-dev-pipeline` and `alternun-auth-prod-pipeline`.

## Required CI/Runtime Env Contract

See [`./.env.example`](./.env.example).

Minimum values to set in CI:

- `AWS_REGION`
- `INFRA_ROOT_DOMAIN`
- `INFRA_ENFORCE_AWS_ACCOUNT=true`
- `INFRA_REQUIRE_ROUTE53=true`
- `INFRA_PIPELINE_REPO`
- `INFRA_PIPELINES`
- `INFRA_PIPELINE_BRANCH_PROD`
- `INFRA_PIPELINE_BRANCH_DEV`
- `INFRA_PIPELINE_BRANCH_IDENTITY_DEV` (when `identity-dev` is included in `INFRA_PIPELINES`)
- `INFRA_PIPELINE_BRANCH_IDENTITY_PROD` (when `identity-prod` is included in `INFRA_PIPELINES`)

Optional but recommended:

- `INFRA_AWS_ACCOUNT_ID` (set this in CodeBuild/CodePipeline env or Secrets Manager; if omitted in buildspec it is derived from STS caller identity)
- `INFRA_ROUTE53_HOSTED_ZONE_ID`
- `INFRA_CODESTAR_CONNECTION_ARN`
- `INFRA_EXPO_CERT_ARN_PRODUCTION`
- `INFRA_EXPO_CERT_ARN_DEV`

Optional identity scaffold env:

- `INFRA_IDENTITY_ENABLED`
- `INFRA_IDENTITY_ENABLED_STAGES`
- `INFRA_IDENTITY_DOMAIN_PRODUCTION`
- `INFRA_IDENTITY_DOMAIN_DEV`
- `INFRA_IDENTITY_DOMAIN_MOBILE`
- `INFRA_IDENTITY_EC2_INSTANCE_TYPE`
- `INFRA_IDENTITY_EC2_VOLUME_SIZE_GIB`
- `INFRA_IDENTITY_RDS_ENGINE_VERSION`
- `INFRA_IDENTITY_RDS_INSTANCE_TYPE`
- `INFRA_IDENTITY_RDS_STORAGE_GIB`
- `INFRA_IDENTITY_RDS_MULTI_AZ`
- `INFRA_IDENTITY_RDS_PUBLIC_ACCESS`
- `INFRA_IDENTITY_RDS_BACKUP_RETENTION_DAYS`
- `INFRA_IDENTITY_RDS_PERFORMANCE_INSIGHTS`
- `INFRA_IDENTITY_RDS_ENHANCED_MONITORING`
- `INFRA_IDENTITY_EMAIL_PROVIDER`
- `INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG`
- `INFRA_IDENTITY_JWT_AUDIENCE`
- `INFRA_IDENTITY_JWT_ROLE_CLAIM`
- `INFRA_IDENTITY_JWT_ROLES_CLAIM`
- `INFRA_IDENTITY_JWT_ACCESS_TOKEN_TTL_MINUTES`

Required for Expo auth-enabled deploys (`INFRA_REQUIRE_EXPO_PUBLIC_AUTH=true`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY` (or `EXPO_PUBLIC_SUPABASE_ANON_KEY`)

Optional auth/wallet env:

- `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID`
- `EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH`
- `EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH`
