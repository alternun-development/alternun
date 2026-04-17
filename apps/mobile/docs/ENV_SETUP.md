# Environment Configuration System

This document explains how environment variables are configured and used in the Alternun mobile app (Expo web), including the build flow and development setup.

## Overview

The mobile app uses a **stage-aware environment system** that automatically loads the correct configuration based on the deployment stage. No manual configuration is needed for local development or deployments.

## Architecture

### Environment Files (All Gitignored)

```
.env                    # Shared defaults + localhost fallback for local dev
.env.development        # Testnet deployment stage overrides
.env.production          # Production deployment stage overrides
.env.local              # Personal developer overrides (highest priority)
```

All `.env*` files are in `.gitignore` to prevent accidentally committing sensitive values.

## File Purpose and Content

### `.env` (Shared Defaults)

Located: `apps/mobile/.env` (in repo, gitignored)

Contains deployment-agnostic values and fallback URLs:

- Supabase configuration (same across all stages)
- WalletConnect project ID
- Google Auth credentials
- Localhost URLs for local dev convenience
- Auth execution provider preference
- Release update mode

```bash
EXPO_PUBLIC_SUPABASE_URL=https://rjebeugdvwbjpaktrrbx.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=...
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth
# Localhost fallback for local development
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
...
```

### `.env` (Local Development Base)

Located: `apps/mobile/.env` (tracked in repo)

Shared defaults for local development:

- Better-auth URLs pointing to `http://localhost:8082`
- Auth exchange URLs for local better-auth service
- Supabase fallback URLs and shared web3 settings
- Auth execution provider preference for local web dev

Used when developing locally without setting `STACK` variable.

### `.env.development` (Testnet Deployment)

Located: `apps/mobile/.env.development` (locally created, gitignored)

**Stage trigger:** `STACK=dev`, `STACK=dashboard-dev`, or any `*testnet*`/`*development*` stage marker

Contains testnet-specific overrides:

```bash
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
AUTH_EXCHANGE_URL=https://testnet.api.alternun.co/auth/exchange
EXPO_PUBLIC_AUTHENTIK_ISSUER=https://testnet.sso.alternun.co/...
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS=60000  # 60 seconds for testnet
```

**Key values:**

- **Auth provider:** better-auth (local embedded auth service)
- **API endpoint:** `https://testnet.api.alternun.co`
- **Authentik:** testnet SSO at `testnet.sso.alternun.co`
- **Discord:** visible through Authentik social login
- **Update check:** 60-second interval (frequent for testing)

### `.env.production` (Production Deployment)

Located: `apps/mobile/.env.production` (locally created, gitignored)

**Stage trigger:** `STACK=production` or `STACK=*production*`

Contains production-specific overrides:

```bash
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
EXPO_PUBLIC_BETTER_AUTH_URL=https://api.alternun.co/auth
AUTH_EXCHANGE_URL=https://api.alternun.co/auth/exchange
EXPO_PUBLIC_AUTHENTIK_ISSUER=https://sso.alternun.co/...
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS=300000  # 300 seconds (5 min)
```

**Key differences from testnet:**

- **Auth provider:** supabase (external auth service)
- **API endpoint:** `https://api.alternun.co` (production)
- **Authentik:** production SSO at `sso.alternun.co`
- **Discord:** visible through Authentik social login
- **Update check:** 300-second interval (less frequent for stability)

### `.env.local` (Personal Developer Overrides)

Located: `apps/mobile/.env.local` (locally created, gitignored)

**Purpose:** Personal developer machine overrides

Highest priority environment file - allows individual developers to override any value without affecting others. Use for:

- Pointing to a custom local API
- Testing specific feature flags
- Overriding auth provider for testing

Example:

```bash
# Point to custom local backend
EXPO_PUBLIC_API_URL=http://localhost:3000

# Test production auth flow locally
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
```

## Environment Variable Precedence (Highest to Lowest)

The build system loads environment files in this order, with **later files overriding earlier ones**:

1. **`.env`** (shared defaults) — loaded first
2. **`.env.development` or `.env.production`** (stage-specific) — overrides `.env` when `STACK` is set
3. **`.env.local`** (personal) — highest priority, overrides everything

### Example

For testnet deployment with `STACK=dev` or `STACK=dashboard-dev`:

```bash
# From .env
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth

# From .env.development (overrides)
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth

# Final value in app: https://testnet.api.alternun.co/auth
```

## Build Flow

### How Environment Variables Get Into the App

The process happens in `apps/mobile/build.sh`:

```mermaid
1. SST invokes: pnpm --filter @alternun/mobile run build:web
   └─> Calls build.sh with environment variables set

2. build.sh executes:
   a) node ../../scripts/generate-changelog-data.mjs

   b) seed_build_auth_env()
      └─> Calls: node ./scripts/mobile-env.cjs build-auth-env
          ├─> Loads .env
          ├─> Loads .env.development/.env.production (if STACK set)
          ├─> Loads .env.local
          └─> Exports resolved auth environment variables

   c) load_env_vars()
      └─> Loads .env files into shell environment
          ├─> load_env_file .env
          ├─> load_env_file .env.development/.env.production (with override=true)
          └─> load_env_file .env.local (with override=true)

   d) pnpm --filter @alternun/auth build
   e) pnpm --filter @alternun/update build
   f) python3 scripts/generate-pwa-icons.py
   g) node ../../packages/update/scripts/export-assets.mjs
   h) disable_expo_dotenv_if_needed()
      └─> Sets EXPO_NO_DOTENV=1 (Expo won't load .env again)

   i) npx expo export -p web
      └─> Builds React app with environment variables baked in
          Environment variables from .env files are available as
          process.env.VARIABLE_NAME in JavaScript code

   j) validate_exported_auth_bundle()
      └─> Verifies auth bundle was exported correctly

3. Expo builds JavaScript bundle with resolved environment values

4. SST uploads dist/ to S3 and invalidates CloudFront cache

5. App available at deployment URL
```

## Variable Resolution Details

### How `mobile-env.cjs` Resolves Values

The `scripts/mobile-env.cjs` script is responsible for extracting auth configuration:

```javascript
// Checks in this order:
1. Shell environment variables (process.env)
2. Loaded .env files (in precedence order)
3. Fallback/default values

// Example for EXPO_PUBLIC_BETTER_AUTH_URL:
readEnvValue(
  process.env,                    // Check shell env first
  fileEnv,                        // Then check loaded .env files
  ['EXPO_PUBLIC_BETTER_AUTH_URL', 'AUTH_BETTER_AUTH_URL'],
  ''                              // Fallback to empty string
)
```

### Load Function Logic

```bash
load_env_file(file_path, allow_override)
  For each KEY=VALUE in file:
    if !allow_override && variable_already_set:
      skip (don't override shell env)
    else:
      export KEY=VALUE
```

**Allow override = false** (for `.env`):

- Won't override variables already set by SST or shell
- Ensures deployment-provided values take precedence

**Allow override = true** (for `.env.development`, `.env.local`):

- Can override `.env` values
- Allows stage-specific and personal customizations

## Usage Scenarios

### Local Development

```bash
# No STACK variable set
cd apps/mobile
pnpm run build:web
```

**Result:**

1. `.env` loads → `EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth`
2. No stage file loaded (STACK not set)
3. `.env.local` loads if it exists
4. App uses localhost for auth

### Testnet Deployment

```bash
# From packages/infra/
STACK=dev pnpm run infra:deploy:dev
```

**Result:**

1. `build.sh` sets `STACK=dev`
2. `.env` loads → localhost URLs
3. `.env.development` loads → **overrides** with `https://testnet.api.alternun.co`
4. App uses testnet API
5. Deployed to `https://testnet.airs.alternun.co`

### Production Deployment

```bash
# From packages/infra/
STACK=production pnpm run infra:deploy:production
```

**Result:**

1. `build.sh` sets `STACK=production`
2. `.env` loads → localhost URLs
3. `.env.production` loads → **overrides** with `https://api.alternun.co`
4. Auth provider changes to `supabase`
5. App uses production API
6. Deployed to `https://airs.alternun.co` or main domain

### Personal Developer Testing

```bash
# Create .env.local for personal testing
EXPO_PUBLIC_API_URL=http://my-custom-backend:3000
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
```

**Result:**

1. Standard `.env` loads
2. `.env.local` overrides with custom values
3. App uses custom backend and Supabase auth for local testing

## Key Environment Variables

### Authentication

| Variable                                  | Testnet                                         | Production                              | Purpose                      |
| ----------------------------------------- | ----------------------------------------------- | --------------------------------------- | ---------------------------- |
| `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER`     | `better-auth`                                   | `supabase`                              | Which auth service to use    |
| `EXPO_PUBLIC_BETTER_AUTH_URL`             | `https://testnet.api.alternun.co/auth`          | `https://api.alternun.co/auth`          | Better-auth service endpoint |
| `EXPO_PUBLIC_AUTH_EXCHANGE_URL`           | `https://testnet.api.alternun.co/auth/exchange` | `https://api.alternun.co/auth/exchange` | Token exchange endpoint      |
| `EXPO_PUBLIC_AUTHENTIK_ISSUER`            | `https://testnet.sso.alternun.co/...`           | `https://sso.alternun.co/...`           | Authentik OIDC issuer        |
| `EXPO_PUBLIC_AUTHENTIK_CLIENT_ID`         | `alternun-mobile`                               | `alternun-mobile`                       | OAuth client ID              |
| `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE` | `authentik`                                     | `authentik`                             | Social login provider        |

### Backend

| Variable                   | Example                                    | Purpose                                           |
| -------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`      | `https://testnet.api.alternun.co`          | API base URL (derived from stage if not explicit) |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://rjebeugdvwbjpaktrrbx.supabase.co` | Supabase API endpoint (shared)                    |
| `EXPO_PUBLIC_SUPABASE_KEY` | `sb_publishable_...`                       | Supabase anon key (shared)                        |

### Release Updates

| Variable                                | Testnet | Production | Purpose                |
| --------------------------------------- | ------- | ---------- | ---------------------- |
| `EXPO_PUBLIC_RELEASE_UPDATE_MODE`       | `on`    | `on`       | Enable release updates |
| `EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS` | `60000` | `300000`   | Check interval (ms)    |

## Development Workflow

### First Time Setup

1. Clone repo
2. Run `pnpm install`
3. (Optional) Create `.env.local` if you want explicit local config

### Local Development

```bash
cd apps/mobile
pnpm run build:web
# Or for hot-reload during development:
pnpm run start
```

No environment configuration needed - localhost is default.

### Testing Testnet Flow Locally

```bash
# Create .env.local
echo "EXPO_PUBLIC_API_URL=https://testnet.api.alternun.co" > .env.local

# Build and test
STACK=dev pnpm run build:web
```

### Modifying Auth Configuration

**For all stages:** Edit `.env`

**For testnet only:** Edit `.env.development`

**For production only:** Edit `.env.production`

**For personal testing:** Edit `.env.local`

## Troubleshooting

### App Using Wrong API Endpoint

**Symptom:** App POSTing to `localhost:8082` instead of testnet API

**Cause:** Environment variables not properly loaded during build

**Fix:**

1. Verify `.env.development` exists and contains correct URLs
2. Verify `STACK=dev` or `STACK=dashboard-dev` is set during deployment
3. Hard refresh browser (Ctrl+Shift+R) to clear cache
4. Check DevTools Network tab to confirm new request URL

### Wrong Auth Provider Active

**Symptom:** App using Supabase auth instead of better-auth (or vice versa)

**Cause:** `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` value incorrect for stage

**Fix:**

1. Check `.env.development` has `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth`
2. Check `.env.production` has `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase`
3. Check `.env.development` has `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik` if you expect Discord on testnet
4. Redeploy after fixing

### Release Updates Not Working

**Symptom:** App not checking for updates

**Cause:** `EXPO_PUBLIC_RELEASE_UPDATE_MODE` not set to `on`

**Fix:**

1. Verify `.env` has `EXPO_PUBLIC_RELEASE_UPDATE_MODE=on`
2. Check `EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS` is reasonable value
3. Redeploy

## Related Files

- `apps/mobile/build.sh` - Main build script that loads environment files
- `apps/mobile/scripts/mobile-env.cjs` - Extracts auth configuration
- `packages/infra/infra.config.ts` - SST configuration that defines stages
- `packages/infra/config/pipelines/specs/core.ts` - Pipeline auth environment setup

## CI/CD Integration

The environment system integrates with the CI/CD pipeline as follows:

1. **GitHub Actions / Build Pipeline** sets `STACK` environment variable
2. **build.sh** detects `STACK` and loads corresponding `.env.*` file
3. **Stage-specific values override** `.env` defaults
4. **Expo build** bakes final values into JavaScript bundle
5. **App deployed** with correct configuration for that stage

No manual environment variable configuration is needed in CI/CD - the stage detection and file loading is automatic.
