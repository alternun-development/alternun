# @alternun/infra

AWS/SST deployment wrapper for Alternun Expo Web using `@lsts_tech/infra`.

## Infrastructure Inventory

For a readable inventory of the actual resources, runtimes, instance sizes, domains, and pipeline topology used by this package, see:

- `packages/infra/INFRASTRUCTURE_SPECS.md`

Important distinction:

- `packages/infra/schemas/` validates secret/config payload shapes
- `packages/infra/INFRASTRUCTURE_SPECS.md` is the infra topology inventory
- `packages/infra/config/infrastructure-specs.ts` is the typed default-spec catalog
- the executable source of truth remains the TypeScript modules under `packages/infra/config` and `packages/infra/modules`

## Stage Domains

- `production` -> `airs.alternun.co`
- `dev` -> `testnet.airs.alternun.co`
- `mobile` (optional) -> `preview.airs.alternun.co`

## Dashboard Stack

For the internal dashboard, the recommended deployment path is a combined dedicated stack:

- `dashboard-dev`
- `dashboard-prod`

These stages deploy both:

- the NestJS backend API
- the Refine admin frontend

This keeps the dependent admin/API surfaces in the same pipeline run while still isolating them from the public Expo stack.

Use them when you want one pipeline to update the internal dashboard end-to-end without risking deletions on `dev` / `production` Expo stacks.

## Admin Site

Refine admin infrastructure is wired into the stack and remains disabled by default.

When `INFRA_ENABLE_ADMIN_SITE=true`, the stack provisions:

- a static SPA deployment built from `apps/admin`
- optional Route53 + CloudFront custom domain mapping for stage-specific admin domains
- build-time environment wiring for API and Authentik endpoints

Current default admin domains:

- `production` -> `admin.alternun.co`
- `dev` -> `testnet.admin.alternun.co`
- `mobile` -> `preview.admin.alternun.co`

Enable/configure through env or local config:

- `INFRA_ENABLE_ADMIN_SITE`
- `INFRA_ADMIN_DEDICATED_STACKS_ONLY` (default `true`)
- `INFRA_ADMIN_ENABLED_STAGES`
- `INFRA_ADMIN_APP_PATH`
- `INFRA_ADMIN_BUILD_COMMAND`
- `INFRA_ADMIN_BUILD_OUTPUT`
- `INFRA_ADMIN_ENABLE_CUSTOM_DOMAIN`
- `INFRA_ADMIN_DOMAIN_PRODUCTION`
- `INFRA_ADMIN_DOMAIN_DEV`
- `INFRA_ADMIN_DOMAIN_MOBILE`
- `INFRA_ADMIN_CERT_ARN_PRODUCTION`
- `INFRA_ADMIN_CERT_ARN_DEV`
- `INFRA_ADMIN_CERT_ARN_MOBILE`
- `INFRA_ADMIN_API_URL_PRODUCTION`
- `INFRA_ADMIN_API_URL_DEV`
- `INFRA_ADMIN_API_URL_MOBILE`
- `INFRA_ADMIN_AUTH_ISSUER_PRODUCTION`
- `INFRA_ADMIN_AUTH_ISSUER_DEV`
- `INFRA_ADMIN_AUTH_ISSUER_MOBILE`
- `INFRA_ADMIN_AUTH_CLIENT_ID`
- `INFRA_ADMIN_AUTH_AUDIENCE`

Important behavior:

- admin provisioning is isolated to dedicated stacks by default (`admin-dev`, `admin-prod`) to avoid coupling admin deploys to the public app stacks
- dedicated admin pipelines force `INFRA_ENABLE_EXPO_SITE=false`, so they do not build/deploy or modify the Expo site
- admin deploys stay inside the same SST/pipeline system as the API and identity stacks, but remain a separate deployment unit
- for dependent admin + API releases, prefer the combined `dashboard-dev` / `dashboard-prod` pipelines

### Admin-Only IaC Provisioning

Deploy admin infrastructure without touching Expo/site resources:

```bash
INFRA_ENABLE_ADMIN_SITE=true \
INFRA_ADMIN_ENABLED_STAGES=dev \
pnpm --filter @alternun/infra run deploy:admin-dev
```

For production admin:

```bash
INFRA_ENABLE_ADMIN_SITE=true \
INFRA_ADMIN_ENABLED_STAGES=production \
pnpm --filter @alternun/infra run deploy:admin-prod
```

## Backend API

NestJS + Fastify backend infrastructure is wired into the stack and remains disabled by default.

When `INFRA_ENABLE_BACKEND_API=true`, the stack provisions:

- a Lambda function built from `apps/api`
- an API Gateway HTTP API with `$default` routing
- CloudWatch logs for the backend runtime
- optional Route53 + API Gateway custom domain mapping for stage-specific API domains

Current default backend domains:

- `production` -> `api.alternun.co`
- `dev` -> `testnet.api.alternun.co`
- `mobile` -> `preview.api.alternun.co`

Enable/configure through env or local config:

- `INFRA_ENABLE_BACKEND_API`
- `INFRA_BACKEND_API_DEDICATED_STACKS_ONLY` (default `true`)
- `INFRA_BACKEND_API_ENABLED_STAGES`
- `INFRA_BACKEND_API_APP_PATH`
- `INFRA_BACKEND_API_BUILD_COMMAND`
- `INFRA_BACKEND_API_BUILD_OUTPUT`
- `INFRA_BACKEND_API_ENABLE_CUSTOM_DOMAIN`
- `INFRA_BACKEND_API_DOMAIN_PRODUCTION`
- `INFRA_BACKEND_API_DOMAIN_DEV`
- `INFRA_BACKEND_API_DOMAIN_MOBILE`
- `INFRA_BACKEND_API_CERT_ARN_PRODUCTION`
- `INFRA_BACKEND_API_CERT_ARN_DEV`
- `INFRA_BACKEND_API_CERT_ARN_MOBILE`
- `INFRA_BACKEND_API_MEMORY_SIZE`
- `INFRA_BACKEND_API_TIMEOUT_SECONDS`
- `INFRA_BACKEND_API_ARCHITECTURE`
- `INFRA_BACKEND_API_LOG_RETENTION_DAYS`
- `INFRA_BACKEND_API_AUTHENTIK_AUDIENCE`
- `INFRA_BACKEND_API_AUTHENTIK_ISSUER`
- `INFRA_BACKEND_API_AUTHENTIK_JWKS_URL`
- `INFRA_BACKEND_API_DATABASE_URL`

Important behavior:

- backend provisioning is isolated to dedicated stacks by default (`api-dev`, `api-prod`) to avoid mixing API runtime changes into the Expo stacks
- dedicated backend pipelines force `INFRA_ENABLE_EXPO_SITE=false`, so they do not build/deploy or modify the static app site
- the current backend target is Lambda + API Gateway, which keeps the first provisioning increment aligned with the existing SST pipeline model
- SST outputs expose backend API deployment metadata including invoke URL, Lambda identifiers, log group, and custom domain when present
- for dependent admin + API releases, prefer the combined `dashboard-dev` / `dashboard-prod` pipelines

### Backend API-Only IaC Provisioning

Deploy backend infrastructure without touching Expo/site resources:

Use dedicated backend stacks. Do not run backend-only toggles against `dev` or `production` stacks, or Pulumi will plan deletions for resources not declared in that run.

Fail-safe guardrails are enforced in both IaC and CI:

- `INFRA_ENABLE_EXPO_SITE=false` is rejected for non-dedicated stack stages
- only `api-dev` / `api-prod` style stages can run backend-only mode

```bash
INFRA_ENABLE_BACKEND_API=true \
INFRA_BACKEND_API_ENABLED_STAGES=dev \
pnpm --filter @alternun/infra run deploy:api-dev
```

For production backend:

```bash
INFRA_ENABLE_BACKEND_API=true \
INFRA_BACKEND_API_ENABLED_STAGES=production \
pnpm --filter @alternun/infra run deploy:api-prod
```

## Identity Infrastructure

Authentik infrastructure is wired into the stack and remains disabled by default.

When `INFRA_IDENTITY_ENABLED=true`, the stack now provisions:

- a dedicated VPC for identity resources
- a public EC2 host for Authentik runtime bootstrap
- a PostgreSQL database (mode selectable: EC2-local or dedicated RDS)
- Route53 DNS for the stage-specific identity domain
- Secrets Manager entries for:
  - Authentik secret key
  - database credentials
  - SMTP credentials placeholder
  - JWT signing key
  - integration config (Google OAuth + Supabase OIDC bridge)

Current default identity domains:

- `production` -> `auth.alternun.co`
- `dev` -> `testnet.auth.alternun.co`
- `mobile` -> `preview.auth.alternun.co`

Enable/configure through env or local config:

- `INFRA_IDENTITY_ENABLED`
- `INFRA_IDENTITY_DEDICATED_STACKS_ONLY` (default `true`)
- `INFRA_IDENTITY_DOMAIN_PRODUCTION`
- `INFRA_IDENTITY_DOMAIN_DEV`
- `INFRA_IDENTITY_DOMAIN_MOBILE`
- `INFRA_IDENTITY_DATABASE_MODE` (`ec2` for local-on-instance DB, `rds` for dedicated DB)
- `INFRA_IDENTITY_EC2_INSTANCE_TYPE`
- `INFRA_IDENTITY_RDS_INSTANCE_TYPE`
- `INFRA_IDENTITY_EMAIL_PROVIDER`
- `INFRA_IDENTITY_AUTHENTIK_IMAGE_TAG` (calendar-version tag, `>= 2025.10`)
- `INFRA_IDENTITY_JWT_AUDIENCE`
- `INFRA_IDENTITY_JWT_ROLE_CLAIM`
- `INFRA_IDENTITY_JWT_ROLES_CLAIM`
- `INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_ID`
- `INFRA_IDENTITY_GOOGLE_AUTH_CLIENT_SECRET`
- `INFRA_IDENTITY_GOOGLE_SOURCE_NAME`
- `INFRA_IDENTITY_GOOGLE_SOURCE_SLUG`
- `INFRA_IDENTITY_SUPABASE_PROJECT_REF` (or `EXPO_PUBLIC_SUPABASE_URL`)
- `INFRA_IDENTITY_SUPABASE_MANAGEMENT_ACCESS_TOKEN` (or `SUPABASE_ACCESS_TOKEN`)
- `INFRA_IDENTITY_SUPABASE_OIDC_CLIENT_ID`
- `INFRA_IDENTITY_SUPABASE_PROVIDER_NAME`
- `INFRA_IDENTITY_SUPABASE_APPLICATION_SLUG`
- `INFRA_IDENTITY_SUPABASE_APPLICATION_NAME`
- `INFRA_IDENTITY_SUPABASE_SYNC_CONFIG`
- `INFRA_IDENTITY_BOOTSTRAP_ADMIN_USERNAME`
- `INFRA_IDENTITY_BOOTSTRAP_ADMIN_EMAIL`
- `INFRA_IDENTITY_BOOTSTRAP_ADMIN_NAME`
- `INFRA_IDENTITY_BOOTSTRAP_ADMIN_PASSWORD` (optional override; otherwise IaC stores a generated value in integration config secret)
- `INFRA_IDENTITY_BOOTSTRAP_ADMIN_GROUP`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_ENABLED`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_NAME`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_SLUG`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_GROUP`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_OPEN_IN_NEW_TAB`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_PUBLISHER`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_DESCRIPTION`
- `INFRA_IDENTITY_DEFAULT_APPLICATION_POLICY_ENGINE_MODE` (`any` or `all`)
- `INFRA_IDENTITY_USERDATA_REPLACE_ON_CHANGE` (default `false`, prevents instance replacement on user-data/template edits)
- `INFRA_IDENTITY_ENABLE_RESOURCE_PROTECTION` (default `true` on production identity stacks)
- `INFRA_IDENTITY_ALLOW_INSTANCE_REPLACEMENT` (default `false`; must be `true` to allow protected replacements)
- `INFRA_ALLOW_IDENTITY_DATABASE_MODE_CHANGE` (default `false`; required for intentional `ec2 <-> rds` migrations)
- `INFRA_ENABLE_EXPO_SITE` (set `false` on dedicated identity stacks to skip Expo/static-site resources)

Important behavior:

- secret names are automatically stage-scoped on creation to avoid dev/production collisions
- identity provisioning is isolated to dedicated stacks by default (`identity-dev`, `identity-prod`) to prevent duplicate instances per environment
- Authentik image tag is validated to calendar-version format and must be `>= 2025.10` (Redisless baseline)
- identity deployment can be stage-scoped with `INFRA_IDENTITY_ENABLED_STAGES` (for example `dev` to keep production untouched)
- default pipeline profile behavior is `identity-dev => INFRA_IDENTITY_DATABASE_MODE=rds` and `identity-prod => INFRA_IDENTITY_DATABASE_MODE=rds`
- the identity VPC does not create NAT by default, keeping the baseline cost lean
- the EC2 host bootstraps Docker + Traefik + Authentik (server/worker) at startup using Secrets Manager values and no Redis
- the bootstrap process creates/updates a default Authentik admin user and default internal application, and can configure Google social source + Supabase OIDC application/provider
- when Supabase management token/project ref are provided, infra patches Supabase `external_keycloak_*` settings automatically
- SST outputs now expose the provisioned identity instance, database, VPC, DNS, and secret metadata
- identity pipelines deploy on isolated stacks (`identity-dev`, `identity-prod`) and force `INFRA_ENABLE_EXPO_SITE=false`, so they do not build/deploy or modify the app site stack
- identity deploys now include safety checks to block accidental database mode flips (`ec2` <-> `rds`) unless explicitly allowed
- identity instances and EIP association can be protected from destructive replacements to reduce auth downtime risk

### Identity-Only IaC Provisioning

Deploy identity infrastructure without touching Expo/site resources:

Use dedicated identity stacks. Do not run identity-only toggles against `dev` or `production` stacks, or Pulumi will plan deletions for resources not declared in that run.

Fail-safe guardrails are enforced in both IaC and CI:

- `INFRA_ENABLE_EXPO_SITE=false` is rejected for non-dedicated stack stages
- only `identity-dev` / `identity-prod` style stages can run identity-only mode

```bash
INFRA_IDENTITY_ENABLED=true \
INFRA_IDENTITY_ENABLED_STAGES=dev \
INFRA_IDENTITY_DATABASE_MODE=rds \
pnpm --filter @alternun/infra run deploy:identity-dev
```

For production identity:

```bash
INFRA_IDENTITY_ENABLED=true \
INFRA_IDENTITY_ENABLED_STAGES=production \
INFRA_IDENTITY_DATABASE_MODE=rds \
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
pnpm --filter @alternun/infra run deploy:api-dev
pnpm --filter @alternun/infra run deploy:api-prod
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

Safety behavior:

- `scripts/ensure-pipelines.sh` now reconciles the production pipeline stack once with the canonical managed pipeline set instead of doing one deploy per missing pipeline
- production pipeline-stack deploys are blocked if they would delete existing managed pipelines, unless `INFRA_ALLOW_PIPELINE_DELETION=true`
- use `INFRA_MANAGED_PIPELINES_CANONICAL` if your repair target should differ from the default full managed set

`INFRA_PIPELINES` supports these targets:

- `production`
- `dev`
- `mobile`
- `dashboard-dev` (combined admin + API pipeline for `SST_STAGE=dashboard-dev`, defaults to `develop` branch)
- `dashboard-prod` (combined admin + API pipeline for `SST_STAGE=dashboard-prod`, defaults to `master` branch)
- `identity-dev` (Authentik-focused pipeline for `SST_STAGE=identity-dev`, defaults to `develop` branch)
- `identity-prod` (Authentik-focused pipeline for `SST_STAGE=identity-prod`, defaults to `master` branch)

Legacy alias: `identity` maps to `identity-dev`.
Created pipeline names include `alternun-prod-pipeline`, `alternun-dev-pipeline`, `alternun-auth-dev-pipeline`, `alternun-auth-prod-pipeline`, `alternun-dash-dev-pipeline`, and `alternun-dash-prod-pipeline`.
Manual escape hatches remain available through the dedicated stack deploy commands (`deploy:api-dev`, `deploy:api-prod`, `deploy:admin-dev`, `deploy:admin-prod`), but they are no longer managed production-pipeline targets.

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
- `INFRA_PIPELINE_BRANCH_DASHBOARD_DEV` (when `dashboard-dev` is included in `INFRA_PIPELINES`)
- `INFRA_PIPELINE_BRANCH_DASHBOARD_PROD` (when `dashboard-prod` is included in `INFRA_PIPELINES`)
- `INFRA_ENFORCE_PIPELINE_DELETE_GUARD=true`

Optional but recommended:

- `INFRA_AWS_ACCOUNT_ID` (set this in CodeBuild/CodePipeline env or Secrets Manager; if omitted in buildspec it is derived from STS caller identity)
- `INFRA_ROUTE53_HOSTED_ZONE_ID`
- `INFRA_CODESTAR_CONNECTION_ARN`
- `INFRA_MANAGED_PIPELINES_CANONICAL`
- `INFRA_EXPO_CERT_ARN_PRODUCTION`
- `INFRA_EXPO_CERT_ARN_DEV`

Optional identity scaffold env:

- `INFRA_IDENTITY_ENABLED`
- `INFRA_IDENTITY_DEDICATED_STACKS_ONLY`
- `INFRA_IDENTITY_ENABLED_STAGES`
- `INFRA_IDENTITY_DOMAIN_PRODUCTION`
- `INFRA_IDENTITY_DOMAIN_DEV`
- `INFRA_IDENTITY_DOMAIN_MOBILE`
- `INFRA_IDENTITY_DATABASE_MODE`
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
