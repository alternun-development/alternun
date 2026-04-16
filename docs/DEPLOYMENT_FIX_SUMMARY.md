# Testnet Auth Provider Regression - Complete Fix

**Status**: ✅ Redeployment in progress (started ~19:30 UTC)  
**Expected completion**: ~19:45 UTC (15 minutes)

---

## Summary

Fixed testnet auth provider showing wrong UI (Authentik Google/Discord instead of better-auth email/password) caused by **stage-aware environment file not loading during build**.

## Root Cause

SST's `StaticSite` passes `EXPO_PUBLIC_STAGE=dev` to the build but the `build.sh` script only checked `SST_STAGE || STACK` when deciding to load `.env.development`. Result:

- Bundle was built with base `.env` (localhost URLs)
- `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE` not set → defaults to `'authentik'` → Discord button shows

## All Fixes Applied

### Fix 1: Top-level Stage Derivation (build.sh)

Derive `STACK` from any available indicator before `seed_build_auth_env`:

```bash
: "${STACK:=${SST_STAGE:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
```

### Fix 2: Consolidated Config (.env.development)

- Renamed `.env.testnet` → `.env.development` (single dev stage file)
- Contains: testnet URLs, `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=supabase`
- Deleted redundant `.env.testnet`

### Fix 3: Mobile Env Detection (mobile-env.cjs)

Added fallback stage detection:

```javascript
const stage =
  envVars.SST_STAGE || envVars.STACK || envVars.EXPO_PUBLIC_STAGE || envVars.EXPO_PUBLIC_ENV;
```

### Fix 4: **CRITICAL** load_env_vars() Stage Detection (build.sh)

The first deploy failed because `load_env_vars()` didn't check `EXPO_PUBLIC_STAGE`. Fixed:

```bash
# BEFORE (missed EXPO_PUBLIC_STAGE):
if [ -n "${SST_STAGE:-}" ] || [ -n "${STACK:-}" ]; then

# AFTER (includes all stage indicators):
local detected_stage="${SST_STAGE:-${STACK:-${EXPO_PUBLIC_STAGE:-${EXPO_PUBLIC_ENV:-}}}}"
if [ -n "$detected_stage" ]; then
```

### Fix 5: CI/CD SSM Parameter Store (NEW)

- `resolve-ssm-env.sh` — resolves Expo env from AWS SSM (CI/CD safe)
- `bootstrap-ssm-parameters.sh` — seeds SSM params (run once per AWS account)
- `build.sh` detects `CODEBUILD_BUILD_ID` and sources SSM script

---

## Files Changed

| File                                                 | Change                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `apps/mobile/build.sh`                               | **✓ TOP-LEVEL STAGE DERIVATION** + **CRITICAL: load_env_vars() stage detection** + SSM CI/CD integration |
| `apps/mobile/scripts/mobile-env.cjs`                 | ✓ Stage detection fallbacks                                                                              |
| `apps/mobile/.env.development`                       | ✓ Created (from .env.testnet) with testnet config                                                        |
| `apps/mobile/.env.testnet`                           | ✓ DELETED (consolidated into .env.development)                                                           |
| `packages/infra/scripts/resolve-ssm-env.sh`          | ✓ NEW: SSM Parameter Store resolver                                                                      |
| `packages/infra/scripts/bootstrap-ssm-parameters.sh` | ✓ NEW: SSM seeder                                                                                        |
| `packages/infra/SSM_PARAMETERS.md`                   | ✓ NEW: SSM setup guide                                                                                   |

---

## Deployment History

1. **First Deploy** (14:00 UTC): ❌ Bundle had `localhost:8082`

   - Root cause: `load_env_vars()` didn't check `EXPO_PUBLIC_STAGE`
   - Result: `.env.development` not loaded

2. **Second Deploy** (19:30 UTC): 🔄 IN PROGRESS
   - Applied critical `load_env_vars()` fix
   - Expected: Bundle has `testnet.api.alternun.co/auth`

---

## Expected Result (After Deployment)

Visit: **https://testnet.airs.alternun.co**

### Should see:

✅ Email/password login form (better-auth)  
✅ "Continue with Google" button  
❌ NO "Continue with Discord" button  
❌ NO Authentik social login buttons

### Browser DevTools → Network:

✅ API calls to `testnet.api.alternun.co`  
❌ NOT to `localhost:8082`

### If old UI persists:

Hard refresh: `Ctrl+Shift+R` (clear CloudFront cache)

---

## Key Config Values

### .env.development (testnet, gitignored)

```
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=better-auth
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=supabase  # ← CRITICAL: disables Discord
```

### Auth Selection Logic (AuthSignInScreen.tsx)

```typescript
shouldShowAuthentikSocialButtons =
  authentikSocialLoginMode !== 'supabase' &&
  (authentikSocialLoginMode === 'authentik' || isAuthentikConfigured());
```

Result: With `mode=supabase`, Discord button is **hidden**. ✓

---

## Next: Bootstrap SSM Parameters

For CI/CD to work, run once per AWS account:

```bash
./packages/infra/scripts/bootstrap-ssm-parameters.sh dev
./packages/infra/scripts/bootstrap-ssm-parameters.sh production
```

This seeds AWS Systems Manager with Expo public env vars (safe, encrypted, no secrets in git).

---

## Verification Checklist

After deployment completes:

- [ ] Visit https://testnet.airs.alternun.co
- [ ] See email/password form (NOT Discord buttons)
- [ ] Browser DevTools → Network shows `testnet.api.alternun.co` calls
- [ ] No errors in Console
- [ ] Can sign in with email/password (or test with Google OAuth if configured)

---

## Documentation

- [`ENVIRONMENT_SETUP_SUMMARY.md`](./ENVIRONMENT_SETUP_SUMMARY.md) — Complete reference
- [`packages/infra/SSM_PARAMETERS.md`](../packages/infra/SSM_PARAMETERS.md) — SSM setup guide
- Memory: `build_script_stage_detection_fix.md` — Technical details of critical fix
