# SSM Parameter Store Configuration for Infra Pipeline

This guide explains how Expo public environment variables are stored in AWS Systems Manager (SSM) Parameter Store for use in CI/CD pipelines, where `.env` files are not available or safe to commit.

## Overview

- **Local development**: Uses `.env` and `.env.local` files (gitignored, not in repo)
- **CI/CD (CodeBuild/GitHub Actions)**: Resolves from SSM Parameter Store
- **Production deployments**: Only SSM, never from `.env`

This prevents accidental commits of secrets and allows independent staging/production configs.

## Parameter Naming Convention

```
/{APP_NAME}/{STAGE}/{PARAMETER_KEY}
```

Examples:

- `/alternun-infra/dev/expo-public-authentik-social-login-mode`
- `/alternun-infra/production/expo-public-better-auth-url-prod`

## Setup

### 1. Bootstrap Parameters (One-time per AWS account/stage)

```bash
# For dev stage
./packages/infra/scripts/bootstrap-ssm-parameters.sh dev

# For production stage
./packages/infra/scripts/bootstrap-ssm-parameters.sh production
```

This creates all required SSM parameters with initial values.

### 2. Verify Parameters

```bash
# List all parameters for a stage
aws ssm describe-parameters \
  --region us-east-1 \
  --filters "Key=Name,Values=/alternun-infra/dev/*" \
  --query 'Parameters[].Name' --output table
```

### 3. Update Individual Parameters

```bash
# Update a parameter value
aws ssm put-parameter \
  --name "/alternun-infra/dev/expo-public-authentik-social-login-mode" \
  --value "authentik" \
  --overwrite \
  --region us-east-1
```

## Available Parameters

### Common (All Stages)

| Parameter                 | Key                                       | Value                                      | Notes                                            |
| ------------------------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Supabase URL              | `expo-public-supabase-url`                | `https://rjebeugdvwbjpaktrrbx.supabase.co` | Shared for testnet/prod                          |
| Supabase Key              | `expo-public-supabase-key`                | `sb_publishable_...`                       | Public/publishable key                           |
| WalletConnect ID          | `expo-public-walletconnect-project-id`    | `d40ba2687be51a76...`                      | Web3 integration                                 |
| Authentik Issuer          | `expo-public-authentik-issuer`            | `https://testnet.sso.alternun.co/...`      | OIDC server URL                                  |
| Authentik Client ID       | `expo-public-authentik-client-id`         | `alternun-mobile`                          | OIDC client ID                                   |
| **Authentik Social Mode** | `expo-public-authentik-social-login-mode` | `authentik`                                | **Critical**: Controls Discord button visibility |
| Authentik Entry Mode      | `expo-public-authentik-login-entry-mode`  | `source`                                   | Login flow mode                                  |

### Dev Stage

| Parameter         | Key                                 | Value                                           |
| ----------------- | ----------------------------------- | ----------------------------------------------- |
| Better-auth URL   | `expo-public-better-auth-url-dev`   | `https://testnet.api.alternun.co/auth`          |
| Auth Exchange URL | `expo-public-auth-exchange-url-dev` | `https://testnet.api.alternun.co/auth/exchange` |

### Production Stage

| Parameter         | Key                                  | Value                                   |
| ----------------- | ------------------------------------ | --------------------------------------- |
| Better-auth URL   | `expo-public-better-auth-url-prod`   | `https://api.alternun.co/auth`          |
| Auth Exchange URL | `expo-public-auth-exchange-url-prod` | `https://api.alternun.co/auth/exchange` |

## How It Works

### During Local Development

```bash
# build.sh uses .env and .env.local (not SSM)
STACK=dev npm run build
```

### During CI/CD (CodeBuild)

```bash
# CodeBuild detects CODEBUILD_BUILD_ID env var
# build.sh calls resolve-ssm-env.sh
# All EXPO_PUBLIC_* vars pulled from SSM instead of .env
```

In CodeBuild, `resolve-ssm-env.sh` clears inherited auth execution and Better Auth URL vars before resolving stage values so stale project-level env cannot override the SSM-backed deploy contract.

The detection in `build.sh`:

```bash
if [ "${CODEBUILD_BUILD_ID:-}" != "" ] || [ "${CI:-}" = "true" ]; then
  source ../../packages/infra/scripts/resolve-ssm-env.sh
fi
```

## Priority Chain

For each variable, resolution order is:

1. **Shell environment** (already set) — highest priority
2. **SSM Parameter Store** (CI/CD path)
3. **Local `.env` files** (dev path)
4. **Hardcoded defaults** — lowest priority

The CI helper intentionally resets the auth contract vars before applying that chain so stage-scoped SSM values win for auth execution and Better Auth routing.

## Key Security Considerations

✅ **DO:**

- Store sensitive values in SSM Parameter Store, not `.env`
- Use SSM for staging/production configs (completely separate from code)
- Rotate Supabase/WalletConnect keys in SSM periodically
- Audit SSM access via CloudTrail

❌ **DON'T:**

- Commit `.env` files with secrets to git
- Use `.env.development`/`.env.production` for CI/CD (these are local-only)
- Hardcode API URLs in source code

## Troubleshooting

### "Failed to get SSM parameter"

```bash
# Verify parameter exists
aws ssm get-parameter \
  --name "/alternun-infra/dev/expo-public-supabase-url" \
  --region us-east-1
```

### Parameters not picked up in build

Check that `CODEBUILD_BUILD_ID` or `CI` env var is set in your CI/CD environment.

### Stage not detected correctly

```bash
# build.sh should derive STACK from EXPO_PUBLIC_STAGE
echo "STACK=${STACK}, EXPO_PUBLIC_STAGE=${EXPO_PUBLIC_STAGE}"
```

## Links

- [AWS SSM Parameter Store Docs](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [build.sh](../../apps/mobile/build.sh) — Expo build script with SSM integration
- [resolve-ssm-env.sh](./scripts/resolve-ssm-env.sh) — SSM parameter resolution helper
