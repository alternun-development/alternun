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
- the repo also checks in `packages/infra/types/sst-globals.d.ts` so CI type-checking does not depend on ignored SST-generated `.sst` artifacts

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
The generated dashboard pipeline env also carries `INFRA_ENFORCE_PIPELINE_DELETE_GUARD=true`, so the production reconciliation step refuses to prune existing managed pipelines unless a removal is explicitly intended.

Use them when you want one pipeline to update the internal dashboard end-to-end without risking deletions on `dev` / `production` Expo stacks.

## Runtime Policy

Approved near-term runtime policy:

- dashboard development/testnet API runs on `Lambda + API Gateway`
- dashboard production API target is a dedicated `EC2 t4g.small`
- admin remains a static site
- identity/authentik remains separate from the app runtime

Current implementation status:

- the backend infrastructure currently implemented in this package is still `Lambda + API Gateway`
- the production `EC2 t4g.small` API target is documented, but not implemented or deployed yet
- do not run a production deploy expecting EC2-backed API infrastructure until that backend module is changed

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
- `INFRA_ADMIN_ALLOWED_EMAIL_DOMAIN`

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
- `INFRA_BACKEND_API_AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED` (set `true` to make `/auth/exchange` fail closed when issuer-owned minting is unavailable)
- `INFRA_BACKEND_API_AUTHENTIK_JWT_SIGNING_KEY` (preferred: sourced from the identity stack's JWT secret output; the `sst-deploy.sh` hydration remains a compatibility fallback)
- `INFRA_BACKEND_API_DATABASE_URL`

Important behavior:

- backend provisioning is isolated to dedicated stacks by default (`api-dev`, `api-prod`) to avoid mixing API runtime changes into the Expo stacks
- dedicated backend pipelines force `INFRA_ENABLE_EXPO_SITE=false`, so they do not build/deploy or modify the static app site
- the current backend target is Lambda + API Gateway, which keeps the first provisioning increment aligned with the existing SST pipeline model
- backend deploys now receive `AUTHENTIK_JWT_SIGNING_KEY` from the matching identity-stage secret output so `/auth/exchange` can mint issuer-owned JWTs without manual secret copying; the deploy script still hydrates it as a compatibility fallback for older flows, and `INFRA_BACKEND_API_AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true` makes the backend fail closed instead of accepting compatibility fallback
- approved runtime direction is Lambda for development/testnet and a dedicated `t4g.small` host for the first production backend target
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
- Route53 DNS-01 ACME on non-production identity stages
- production ALB + ACM in front of the identity host
- Secrets Manager entries for:
  - Authentik secret key
  - database credentials
  - SMTP credentials placeholder
  - JWT signing key
  - integration config (Google OAuth + Supabase OIDC bridge)

Current default identity domains:

- `production` -> `sso.alternun.co`
- `dev` -> `testnet.sso.alternun.co`
- `mobile` -> `preview.sso.alternun.co`

### Mobile Auth Entry Mode

The mobile web auth surface supports two Authentik entry patterns:

- `source` jumps straight to Authentik's social source login route.
- `relay` keeps the app as the visible entrypoint and routes through `/auth-relay` before starting the Authentik login flow.

Control the mode with `EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE` in repo env, pipeline env, or `packages/infra/config/deployment.config.json`.
The default is `source`, which is the smoothest option and avoids an extra relay hop unless you explicitly opt in.
Use `AUTH_EXECUTION_PROVIDER` or `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` to choose the login execution engine. Set it to `better-auth` when the testnet bundle should use Better Auth, or `supabase` for the rollback/legacy path.
Use `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE` to control whether the app uses Authentik-only social login, the hybrid Authentik/Supabase fallback path, or Supabase-only login. This is not the Better Auth switch.
The default is `authentik` for deployed bundles so testnet/prod stay Authentik-first unless you explicitly opt into another mode, while non-production Expo bundles now default the execution provider to `supabase`.
Use `hybrid` only when you intentionally want Supabase fallback while iterating locally.
The Expo build also receives `EXPO_PUBLIC_API_URL` for the matching stage API origin so the auth footer and privacy/terms drawers fetch legal content from the correct backend without guessing.
If you later stand up a real Better Auth service, keep the browser-facing URL on the API origin root (`https://<api-host>`) and let the client/proxy layers append `/auth` internally. The internal dev server can remain on `http://localhost:9083` during local development behind the API proxy. The repo no longer ships with the old dedicated testnet host wired in.
The API bootstrap reads the Better Auth proxy target from `BETTER_AUTH_URL` in local dev and from `AUTH_BETTER_AUTH_URL` in deployed stacks, so keep the proxy target separate from the browser-facing `AUTH_BETTER_AUTH_URL` / `EXPO_PUBLIC_BETTER_AUTH_URL` browser URL.
The core web pipelines now set `AUTH_EXECUTION_PROVIDER` / `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` from stage env, keep `EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE=source`, `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik`, inject `EXPO_PUBLIC_API_URL` for the matching stage API origin, and set `EXPO_PUBLIC_RELEASE_UPDATE_MODE=on` so the bundles fetch policy content from the correct API and get a reload prompt when a new release is detected. The current testnet env opts into Better Auth execution while production stays on the legacy path unless you explicitly override it. When Better Auth is enabled, the browser still talks to the API `/auth` route rather than a separate public auth port.
`EXPO_PUBLIC_AUTHENTIK_ISSUER` and `EXPO_PUBLIC_AUTHENTIK_CLIENT_ID` should be present in env, but deployed web builds now derive sane defaults from the live `airs` origin if they are omitted. `EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI` is also optional in deployed web builds; when omitted, the shared auth helpers derive `https://<airs-domain>/auth/callback` from the current browser origin. During local web development, the active browser origin wins over stale loopback or testnet redirect values so callbacks stay on the current app instance.
Custom Authentik provider-flow slugs are now explicit only. Set `EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS=true` and `EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS` or `INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS=true` and `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG` / `INFRA_IDENTITY_DISCORD_LOGIN_FLOW_SLUG` only when you intentionally want a custom starter flow. When those values are blank, the app uses the direct source-login path and the identity bootstrap stays on the direct source-login flows. For Google, `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_MODE=logout-then-source` is still experimental; leave it at `source` unless you are deliberately testing the logout-first custom flow.
The deploy path now validates that non-Better-Auth web builds do not carry Better Auth URLs in env, and the Expo web export fails if the emitted bundle still contains stale direct Better Auth host paths such as `http://localhost:9083/auth/*`, legacy `/better-auth/*` login paths, or an inlined non-production `better-auth` execution default.
The mobile provider also uses a dedicated invalidation flow with `User Logout` plus `Redirect` stages, and the bootstrap derives the app-root post-logout redirect from the mobile launch URL when no explicit list is provided, so logout returns to the app instead of stopping on Authentik's success page.

### Release Update Banner

The shared release-update package lives in `packages/update` and is used by the web and Expo surfaces to detect when a newer build is available.
It generates a version manifest and a tiny service worker from the current package version during each app build.

Build entrypoints:

- Expo web: `pnpm --filter @alternun/mobile run build:web`
- Next.js web: `pnpm --filter @alternun/web run build`

Mode switches:

- `EXPO_PUBLIC_RELEASE_UPDATE_MODE=auto|on|off`
- `NEXT_PUBLIC_RELEASE_UPDATE_MODE=auto|on|off`

Recommended values:

- deployed Expo builds: `on`
- localhost or loopback development: `auto`
- temporary opt-out: `off`

Expo builds also receive `EXPO_PUBLIC_ORIGIN` so the runtime can resolve the deployed manifest URL even when the shell is not running in a browser.

Enable/configure through env or local config:

- `INFRA_IDENTITY_ENABLED`
- `INFRA_IDENTITY_DEDICATED_STACKS_ONLY` (default `true`)
- `INFRA_IDENTITY_DOMAIN_PRODUCTION`
- `INFRA_IDENTITY_DOMAIN_DEV`
- `INFRA_IDENTITY_DOMAIN_MOBILE`
- `INFRA_IDENTITY_INGRESS_MODE_PRODUCTION`
- `INFRA_IDENTITY_INGRESS_MODE_DEV`
- `INFRA_IDENTITY_INGRESS_MODE_MOBILE`
- `INFRA_IDENTITY_TLS_MODE_PRODUCTION`
- `INFRA_IDENTITY_TLS_MODE_DEV`
- `INFRA_IDENTITY_TLS_MODE_MOBILE`
- `INFRA_IDENTITY_TLS_ACME_EMAIL`
- `INFRA_IDENTITY_TLS_ROUTE53_HOSTED_ZONE_ID`
- `INFRA_IDENTITY_TLS_ACME_BACKUP_ENABLED`
- `INFRA_IDENTITY_TLS_ACME_BACKUP_PREFIX`
- `INFRA_IDENTITY_ALB_CERTIFICATE_ARN`
- `INFRA_IDENTITY_ALB_HEALTH_CHECK_PATH`
- `INFRA_IDENTITY_ALB_HEALTH_CHECK_MATCHER`
- `INFRA_IDENTITY_ALB_IDLE_TIMEOUT_SECONDS`
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
- `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_SLUG` (optional; set only when you intentionally want a custom outer Authentik starter flow, otherwise leave it empty for direct source login)
- `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_MODE` (optional; `source` keeps the direct source path, `logout-then-source` is experimental and frontloads a logout stage before `SourceStage`)
- `INFRA_IDENTITY_DISCORD_AUTH_CLIENT_ID`
- `INFRA_IDENTITY_DISCORD_AUTH_CLIENT_SECRET`
- `INFRA_IDENTITY_DISCORD_SOURCE_NAME`
- `INFRA_IDENTITY_DISCORD_SOURCE_SLUG`
- `INFRA_IDENTITY_DISCORD_LOGIN_FLOW_SLUG` (optional; set only when you intentionally want a custom outer Authentik starter flow, otherwise leave it empty for direct source login)
- `EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS` (set `true` only when you intentionally want custom provider-flow slugs in the app bundle)
- `INFRA_ALLOW_CUSTOM_AUTHENTIK_PROVIDER_FLOW_SLUGS` (set `true` only when you intentionally want custom provider-flow slugs)
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
- `AUTH_EXECUTION_PROVIDER` / `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` (`better-auth` is the current testnet rollout path; use `supabase` only for rollback/legacy)
- `EXPO_PUBLIC_API_URL` (stage API origin used by the auth footer and legal drawers; `https://testnet.api.alternun.co` on testnet)
- `AUTH_BETTER_AUTH_URL` / `EXPO_PUBLIC_BETTER_AUTH_URL` (`https://testnet.api.alternun.co` for the canonical browser-facing Better Auth route; `/auth` is appended by the client/proxy layers)
- `AUTH_EXCHANGE_URL` / `EXPO_PUBLIC_AUTH_EXCHANGE_URL` (`https://testnet.api.alternun.co/auth/exchange` for the canonical issuer handoff)
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
- non-production identity defaults to direct instance ingress with Traefik Route53 DNS-01 ACME
- non-production identity persists Traefik ACME state locally and backs it up to a private S3 bucket for restore after instance replacement
- production identity defaults to ALB + ACM, with the ALB terminating TLS and forwarding HTTPS to the instance
- the bootstrap process creates/updates a default Authentik admin user and default internal application, and can configure Google and Discord social sources + Supabase OIDC application/provider
- the default internal application tile falls back to the stage-specific admin dashboard origin, so it opens the dashboard instead of the Authentik library unless you override `INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL`
- the dedicated identity pipelines intentionally leave `INFRA_IDENTITY_DEFAULT_APPLICATION_LAUNCH_URL` unset so the internal tile keeps that admin-dashboard fallback; only the mobile tile should point at the AIRS auth entrypoint
- the Docs CMS Authentik application tile now points at the configured docs `/admin` entry route so its Google relay starts from the app instead of the Authentik library
- non-production identity stages promote any authenticated social-login user to `internal`, so testnet signup reaches the interface; production stays on the `alternun.io` domain gate
- the Google source bootstrap binds a username-mapping policy to `default-source-enrollment-prompt`, so first-time Google enrollments reuse the upstream email as the username and skip the manual Authentik username screen
- the custom Google starter flow can optionally run `User Logout` before `SourceStage` when `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_MODE=logout-then-source` is set, but that mode is still experimental and should not be treated as the default fix for stale browser sessions
- the `Alternun Mobile` Authentik application tile defaults to the stage-specific AIRS auth entrypoint (`/auth?next=/`) so the tile opens the app instead of the Authentik library
- `AUTH_EXECUTION_PROVIDER` / `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` (`better-auth` is the current testnet rollout path; keep `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik` only for the Authentik fallback path)
- in direct source mode, Authentik must keep `default-source-authentication` and `default-source-enrollment` open (`authentication=none`) and prune `UserLoginStage` from both flows; keeping `default-source-authentication-login` or `default-source-enrollment-login` causes Google callback loops or `SourceStage` token crashes instead of dashboard redirects
- the identity deploy template reapplies the live Authentik source-stage runtime hotfix on every identity rollout so the `FlowToken` delete crash stays patched after redeploys
- local development can point the default internal app tile, the admin app tile/callbacks, the mobile app tile launch URL, and the mobile OIDC callbacks and post-logout redirects at localhost via `INFRA_IDENTITY_ADMIN_OIDC_LOCAL_DEV_URL`, `INFRA_IDENTITY_MOBILE_OIDC_LAUNCH_URL`, `INFRA_MOBILE_OIDC_REDIRECT_URLS`, and `INFRA_MOBILE_OIDC_POST_LOGOUT_REDIRECT_URLS`
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
