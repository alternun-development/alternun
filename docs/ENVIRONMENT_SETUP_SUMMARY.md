# Environment Configuration & Auth Provider Setup

## Summary of Changes (2026-04-16)

This document consolidates all changes made to fix testnet auth provider regression and implement secure CI/CD environment handling.

---

## Issue: Testnet Auth Provider Regression

**Symptom**: testnet.airs.alternun.co drifted into the wrong auth/UI state during deploy because the stage-aware env file was not loaded, which let the bundle fall back to localhost or legacy defaults.

**Root Cause**: SST's `StaticSite` passes `EXPO_PUBLIC_STAGE=dev` to the build but **not** `STACK`/`SST_STAGE`. The build script's env resolution only checked `SST_STAGE || STACK`, missing the `EXPO_PUBLIC_STAGE` variable. Result: app was bundled with localhost URLs and no auth provider mode override.

---

## Fix 1: Build Script Stage Derivation

**File**: `apps/mobile/build.sh`

**Change**: At startup, derive `STACK` from any available stage indicator:

```bash
: "${STACK:=${SST_STAGE:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
: "${SST_STAGE:=${STACK:-}}"
export STACK SST_STAGE
```

This ensures `STACK` is always available when `seed_build_auth_env` calls `mobile-env.cjs`.

**Also**:

- Changed stage-specific file from `.env.testnet` → `.env.development`
- Added SSM Parameter Store fallback for CI/CD (see below)

---

## Fix 2: Consolidated Stage-Specific Config

**File**: `apps/mobile/.env.development` (renamed from `.env.testnet`)

**Contents** (gitignored, safe for local dev + CI/CD via SSM):

```bash
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
EXPO_PUBLIC_AUTH_EXCHANGE_URL=https://testnet.api.alternun.co/auth/exchange
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik  # ← KEY: shows Discord button
EXPO_PUBLIC_AUTHENTIK_ISSUER=https://testnet.sso.alternun.co/application/o/alternun-mobile/
EXPO_PUBLIC_AUTHENTIK_CLIENT_ID=alternun-mobile
```

**Why `.env.development`?**

- Single file for dev/testnet stages (simpler than multiple files)
- `mobile-env.cjs` loads it when stage is `dev|api-dev|*testnet*|*development*`
- Local devs override with `.env.local` for localhost URLs

---

## Fix 3: Mobile Env Resolution Stage Detection

**File**: `apps/mobile/scripts/mobile-env.cjs`

**Change**: Added fallback stage indicators:

```javascript
const stage =
  envVars.SST_STAGE || envVars.STACK || envVars.EXPO_PUBLIC_STAGE || envVars.EXPO_PUBLIC_ENV;
```

Now resolves stage from:

1. `SST_STAGE` (sst deploy)
2. `STACK` (sst deploy or local export)
3. `EXPO_PUBLIC_STAGE` (SST's StaticSite)
4. `EXPO_PUBLIC_ENV` (fallback)

---

## Fix 4: CI/CD Env Resolution via SSM Parameter Store

**Problem**: Infrastructure pipeline CI/CD (CodeBuild) can't access `.env` files (gitignored). Secrets like Supabase keys, Authentik config must be injected safely.

**Solution**: Two new scripts + integration:

### Script 1: `packages/infra/scripts/resolve-ssm-env.sh`

Resolves Expo public env vars from AWS Systems Manager Parameter Store.

**Usage**:

```bash
source packages/infra/scripts/resolve-ssm-env.sh
# Exports: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY, etc.
```

**Priority chain**:

1. Shell environment (if already set)
2. SSM Parameter Store (CI/CD)
3. Hardcoded defaults (fallback)

### Script 2: `packages/infra/scripts/bootstrap-ssm-parameters.sh`

Seeds SSM with all required Expo public env vars (run once per AWS account/stage).

**Usage**:

```bash
./packages/infra/scripts/bootstrap-ssm-parameters.sh dev
./packages/infra/scripts/bootstrap-ssm-parameters.sh production
```

**Parameter naming**: `/{APP_NAME}/{STAGE}/{PARAMETER_KEY}`

- `/alternun-infra/dev/expo-public-supabase-url`
- `/alternun-infra/dev/expo-public-authentik-social-login-mode` (value: `authentik`)
- `/alternun-infra/production/expo-public-authentik-social-login-mode` (value: `authentik`)

### Integration: `apps/mobile/build.sh`

Auto-detects CI/CD and sources SSM script:

```bash
if [ "${CODEBUILD_BUILD_ID:-}" != "" ] || [ "${CI:-}" = "true" ]; then
  echo "CI/CD detected: resolving Expo env from SSM Parameter Store..."
  source ../../packages/infra/scripts/resolve-ssm-env.sh
fi
```

**Flow**:

- **Local dev**: `STACK=dev npm run build` → uses `.env` / `.env.local`
- **CI/CD**: CodeBuild sets `CODEBUILD_BUILD_ID` → build.sh sources SSM script → `mobile-env.cjs` uses SSM values

---

## Key Parameters (SSM Parameter Store)

### Critical (Controls Auth UI)

| Parameter                                 | Dev Value   | Prod Value  | Effect                                             |
| ----------------------------------------- | ----------- | ----------- | -------------------------------------------------- |
| `expo-public-authentik-social-login-mode` | `authentik` | `authentik` | Keeps Google + Discord visible in deployed bundles |

### Common (All Stages)

| Parameter                                | Value                                      |
| ---------------------------------------- | ------------------------------------------ |
| `expo-public-supabase-url`               | `https://rjebeugdvwbjpaktrrbx.supabase.co` |
| `expo-public-supabase-key`               | `sb_publishable_...`                       |
| `expo-public-walletconnect-project-id`   | `d40ba2687be51a76...`                      |
| `expo-public-authentik-issuer`           | `https://testnet.sso.alternun.co/...`      |
| `expo-public-authentik-client-id`        | `alternun-mobile`                          |
| `expo-public-authentik-login-entry-mode` | `source`                                   |

### Dev Stage

| Parameter                           | Value                                           |
| ----------------------------------- | ----------------------------------------------- |
| `expo-public-better-auth-url-dev`   | `https://testnet.api.alternun.co/auth`          |
| `expo-public-auth-exchange-url-dev` | `https://testnet.api.alternun.co/auth/exchange` |

### Prod Stage

| Parameter                            | Value                                   |
| ------------------------------------ | --------------------------------------- |
| `expo-public-better-auth-url-prod`   | `https://api.alternun.co/auth`          |
| `expo-public-auth-exchange-url-prod` | `https://api.alternun.co/auth/exchange` |

---

## Auth Selection Logic (AuthSignInScreen.tsx)

```typescript
const shouldShowAuthentikSocialButtons =
  authentikSocialLoginMode !== 'supabase' &&
  (authentikSocialLoginMode === 'authentik' || isAuthentikConfigured());
```

**Result**:

- **Testnet** (`EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik`): Shows Google + Discord + email
- **Production** (`EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik`): Shows Google + Discord + email

---

## Files Changed/Created

| File                                                 | Change                                          | Type     |
| ---------------------------------------------------- | ----------------------------------------------- | -------- |
| `apps/mobile/build.sh`                               | Stage derivation + SSM CI/CD integration        | Modified |
| `apps/mobile/scripts/mobile-env.cjs`                 | Added stage detection fallbacks                 | Modified |
| `apps/mobile/.env.development`                       | Renamed from `.env.testnet` with testnet config | Modified |
| `apps/mobile/.env.testnet`                           | Deleted (consolidated into `.env.development`)  | Deleted  |
| `packages/infra/scripts/resolve-ssm-env.sh`          | NEW: SSM Parameter Store resolver               | New      |
| `packages/infra/scripts/bootstrap-ssm-parameters.sh` | NEW: SSM parameter seeder                       | New      |
| `packages/infra/SSM_PARAMETERS.md`                   | NEW: SSM setup & reference guide                | New      |

---

## Deployment & Verification

### Preferred Testnet Redeployment

```bash
set -a
source apps/mobile/.env.development
set +a

pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

Status: ✅ **Complete** (2026-04-16, verified manually)

### Verify Fix

1. Visit: https://testnet.airs.alternun.co
2. Expected: Email form + Google button + Discord button
3. Check DevTools → Network → confirm `testnet.api.alternun.co` (not localhost)
4. If old UI persists: Hard refresh (`Ctrl+Shift+R`)

---

## Next Steps for CI/CD

1. **Bootstrap SSM parameters** (once per AWS account):

   ```bash
   ./packages/infra/scripts/bootstrap-ssm-parameters.sh dev
   ./packages/infra/scripts/bootstrap-ssm-parameters.sh production
   ```

2. **Update CodeBuild buildspec.yml** (if exists) to ensure IAM role has SSM permissions:

   ```yaml
   IAMPermissions:
     - ssm:GetParameter
     - ssm:GetParameters
   ```

3. **Test CI/CD build**:
   - Push a commit to trigger pipeline
   - Verify build.sh sources `resolve-ssm-env.sh`
   - Confirm EXPO*PUBLIC*\* values come from SSM, not .env

## Fix 5: Auth URL Single-Source-of-Truth Pattern (2026-04-17)

**File**: `apps/mobile/components/auth/AppAuthProvider.tsx`

**Problem**: Auth endpoint paths were being constructed from base URLs, but local dev needed both the API base AND the `/auth` suffix appended.

**Solution**: Refactored `getBetterAuthUrl()` to ensure auth URLs always include `/auth`:

```typescript
// One source of truth: EXPO_PUBLIC_BETTER_AUTH_URL
function getBetterAuthUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
  if (envUrl?.trim()) {
    // Already has /auth suffix (e.g., http://localhost:8082/auth)
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Fallback: derive from origin and append /auth
  const apiBase = resolveMobileApiBaseUrl(undefined, origin);
  if (apiBase) {
    const normalized = apiBase.trim().replace(/\/+$/, '');
    return normalized.endsWith('/auth') ? normalized : `${normalized}/auth`;
  }
  return undefined;
}
```

**Result**: All endpoints automatically derived:

- `${baseAuthUrl}/sign-in/social`
- `${baseAuthUrl}/sign-in/email`
- `${baseAuthUrl}/exchange`
- Etc.

**Local Dev Setup** (`.env.local`):

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
```

**Testnet** (`.env.development`):

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
```

**Why?**

- ✅ Single variable controls all auth endpoints
- ✅ No hardcoded paths scattered in code
- ✅ Works for both local (localhost:8082) and remote (testnet) seamlessly
- ✅ Easier to maintain: change one variable, all endpoints update

**See Also**: [.env.local.example](../apps/mobile/.env.local.example) — Local dev setup template

---

## Security Best Practices

✅ **DO:**

- Store secrets in SSM Parameter Store (CI/CD only)
- Keep `.env.development` / `.env.production` gitignored
- Use `.env.local` for local overrides (e.g., localhost URLs)
- Rotate Supabase/WalletConnect keys periodically in SSM

❌ **DON'T:**

- Commit `.env` files with secrets to git
- Use `.env` files for CI/CD (only local dev)
- Hardcode API URLs in source code
- Check in SSM parameter values directly

---

## References

- [build.sh](../apps/mobile/build.sh) — Build script with stage derivation
- [mobile-env.cjs](../apps/mobile/scripts/mobile-env.cjs) — Env resolution logic
- [AppAuthProvider.tsx](../apps/mobile/components/auth/AppAuthProvider.tsx) — Auth URL derivation (single-source-of-truth)
- [.env.development](../apps/mobile/.env.development) — Dev/testnet config
- [.env.local.example](../apps/mobile/.env.local.example) — Local dev setup template
- [resolve-ssm-env.sh](../packages/infra/scripts/resolve-ssm-env.sh) — SSM resolver
- [bootstrap-ssm-parameters.sh](../packages/infra/scripts/bootstrap-ssm-parameters.sh) — SSM seeder
- [SSM_PARAMETERS.md](../packages/infra/SSM_PARAMETERS.md) — SSM setup guide
