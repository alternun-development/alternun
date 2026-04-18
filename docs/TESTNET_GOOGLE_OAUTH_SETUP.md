# Testnet Google OAuth Setup — Better Auth Embedded Mode

## Overview

This document covers the complete setup for enabling native Google OAuth on testnet via **embedded Better Auth**, completely bypassing Authentik for that stage only. Production remains on Authentik.

**Key changes**:

- ✅ API now supports both proxy mode (Authentik) and embedded mode (native Google)
- ✅ Testnet will use embedded mode with `ALTERNUN_TESTNET_MODE=on`
- ✅ Cross-subdomain cookies enabled for `airs.*` and `api.*` subdomains
- ✅ Secure cookies in production, non-secure in dev/local

---

## Prerequisites

You need:

- **Google OAuth 2.0 credentials** (Client ID and Client Secret) from Google Cloud Console
  - Already created from previous auth setup or new project
  - Must have testnet callback URL registered
- **AWS Secrets Manager** access in the Alternun account (124120088516)
- **GitHub repository** access to update workflow secrets
- **Deployed testnet infrastructure** (api.testnet.alternun.co running)

---

## Step 1: Set Up Google Cloud Console

### Register Callback URL

On your Google Cloud Console OAuth 2.0 credentials (testnet client):

**Authorized redirect URIs** — add these:

```
https://testnet.api.alternun.co/auth/callback/google
http://localhost:8082/auth/callback/google
```

**Authorized JavaScript origins** — add these:

```
https://testnet.api.alternun.co
https://testnet.airs.alternun.co
http://localhost:8081
http://localhost:8082
```

**Consent screen**:

- Application name: "AIRS (Testnet)"
- Application logo: (use the same logo as prod)
- User support email: (your email)
- Developer contact: your email
- Scopes: `openid profile email` (minimal)
- Test users: Add your email and any testnet user emails

### Copy Credentials

From **OAuth 2.0 Client IDs** → **testnet-web** credential:

- Copy **Client ID** (long alphanumeric string)
- Copy **Client Secret** (long alphanumeric string)

Keep these handy for the next steps.

---

## Step 2: Store Secrets in AWS Secrets Manager

### Create Testnet OAuth Secret

In **AWS Secrets Manager** (Alternun account, `us-east-1` region):

```bash
aws secretsmanager create-secret \
  --name /alternun-infra/dev/testnet-google-oauth \
  --description "Google OAuth 2.0 credentials for testnet Better Auth" \
  --secret-string '{
    "GOOGLE_AUTH_CLIENT_ID": "YOUR_TESTNET_CLIENT_ID_HERE",
    "GOOGLE_AUTH_CLIENT_SECRET": "YOUR_TESTNET_CLIENT_SECRET_HERE"
  }' \
  --region us-east-1
```

Or use the AWS Console:

1. Go to **Secrets Manager**
2. Click **Create secret**
3. Secret type: **Other type of secret**
4. Key/value:
   ```
   GOOGLE_AUTH_CLIENT_ID = <your testnet client ID>
   GOOGLE_AUTH_CLIENT_SECRET = <your testnet client secret>
   ```
5. Secret name: `/alternun-infra/dev/testnet-google-oauth`
6. Click **Create secret**

### Verify the Secret

```bash
aws secretsmanager get-secret-value \
  --secret-id /alternun-infra/dev/testnet-google-oauth \
  --region us-east-1
```

Expected output: `SecretString` contains your client ID and secret.

---

## Step 3: Update GitHub Actions Secrets (CI/CD)

In your GitHub repository settings → **Secrets and variables** → **Actions**:

Add these **Repository secrets**:

```
TESTNET_GOOGLE_AUTH_CLIENT_ID = <your testnet client ID>
TESTNET_GOOGLE_AUTH_CLIENT_SECRET = <your testnet client secret>
```

These are used during GitHub Actions deployment to inject credentials into the CDK build environment.

---

## Step 4: Preferred Live Testnet Deploy Flow

The validated live rollout path uses the repo deploy wrappers, not raw `sst-deploy.sh`.

### CI / GitHub Actions

Update the deploy job to export the Google credentials, source the testnet mobile env, and run the two owning stacks:

```yaml
- name: Deploy testnet infrastructure
  if: github.ref == 'refs/heads/develop'
  env:
    GOOGLE_AUTH_CLIENT_ID: ${{ secrets.TESTNET_GOOGLE_AUTH_CLIENT_ID }}
    GOOGLE_AUTH_CLIENT_SECRET: ${{ secrets.TESTNET_GOOGLE_AUTH_CLIENT_SECRET }}
    ALTERNUN_TESTNET_MODE: 'on'
  run: |
    set -a
    source apps/mobile/.env.development
    set +a
    pnpm infra:deploy:dev
    pnpm infra:deploy:dashboard-dev
```

### Local Deployment

When deploying locally to testnet:

```bash
export GOOGLE_AUTH_CLIENT_ID="your-testnet-client-id"
export GOOGLE_AUTH_CLIENT_SECRET="your-testnet-client-secret"
export ALTERNUN_TESTNET_MODE=on

set -a
source apps/mobile/.env.development
set +a

pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

`dev` owns the Expo bundle, `dashboard-dev` owns the API/auth runtime, and `identity-dev` owns Authentik.

---

## Step 5: Deploy and Verify

### Redeploy API

```bash
# Ensure env vars are set
export GOOGLE_AUTH_CLIENT_ID="..."
export GOOGLE_AUTH_CLIENT_SECRET="..."
export ALTERNUN_TESTNET_MODE=on

set -a
source apps/mobile/.env.development
set +a

pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

Wait for CloudFront invalidation to complete (1–3 minutes).

### Verification Checklist

#### 1. Check `/auth/callback/google` is no longer 404

```bash
curl -i https://testnet.api.alternun.co/auth/callback/google
```

**Expected**:

- Status: `400 Bad Request` (missing state parameter) or `200 OK`
- **NOT** `404 Not Found`

If you see `404`:

- The route is not mounted (check Lambda deployment logs)
- Go to [Step 5 Troubleshooting](#troubleshooting)

#### 2. Check session endpoint responds

```bash
curl -i https://testnet.api.alternun.co/auth/session
```

**Expected**: `200 OK` with JSON response like `{"session": null}`

#### 3. Verify Lambda environment has credentials

```bash
aws lambda get-function-configuration \
  --function-name alternun-dev-nestjs-api \
  --query 'Environment.Variables' | grep -E "GOOGLE_AUTH|AUTH_BETTER_AUTH"
```

**Expected output**:

```json
{
  "GOOGLE_AUTH_CLIENT_ID": "...",
  "GOOGLE_AUTH_CLIENT_SECRET": "...",
  "AUTH_BETTER_AUTH_URL": "https://testnet.api.alternun.co",
  "ALTERNUN_TESTNET_MODE": "on"
}
```

If any are missing → the environment variables didn't make it through the deploy.

#### 4. Test Google OAuth flow

1. Open **https://testnet.airs.alternun.co/auth?next=%2F** in **incognito** browser
2. You should see the Better Auth login form with Google and Discord visible
3. Click **"Sign in with Google"** or **"Continue with Discord"**
4. You should be redirected to the corresponding provider login
5. After login, you should be redirected back to **testnet.airs.alternun.co** with a session cookie

**Check the session cookie**:

- Open **DevTools** → **Application** → **Cookies** → **https://testnet.airs.alternun.co**
- Look for a cookie like `auth_session` or `better-auth.session`
- Verify:
  - ✅ `Domain: .alternun.co` (parent domain for cross-subdomain)
  - ✅ `Secure` is checked (HTTPS-only)
  - ✅ `HttpOnly` is checked
  - ✅ `SameSite: Lax` or `Strict`

#### 5. Check Supabase

Verify the new user appears in Supabase:

```bash
# In Supabase → SQL Editor
SELECT id, email, raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE email = 'your-test-email@gmail.com'
LIMIT 1;
```

Should show:

- `raw_app_meta_data` contains `{ "provider": "google", ... }` or `{ "provider": "discord", ... }`
- Email matches your Google account email

#### 6. Test production is still on Authentik

Verify **airs.alternun.co** (production) still shows Discord button:

```bash
# Should still show Discord button
curl https://airs.alternun.co/auth | grep -i discord
```

Should return HTML containing a Discord login button (not just email/Google).

---

## Step 6: Rollback (if needed)

If testnet breaks, you can immediately disable embedded Better Auth:

### Option 1: Flip the environment variable (fastest)

```bash
# Remove testnet mode flag
unset ALTERNUN_TESTNET_MODE

set -a
source apps/mobile/.env.development
set +a

pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

This reverts the API to proxy mode (requires a working external Better Auth service to be available, or will fail with its own errors). **Recommendation**: Use this only as a temporary rollback while investigating.

### Option 2: Revert the commit

```bash
git revert <commit-sha-that-added-testnet-oauth>
git push origin develop

# Trigger deployment in CI
# Or manually:
set -a
source apps/mobile/.env.development
set +a
pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

---

## Troubleshooting

### `/auth/callback/google` still returns 404

**Cause**: Lambda environment doesn't have Google credentials or `ALTERNUN_TESTNET_MODE` isn't set.

**Fix**:

1. Verify environment variables are in Lambda:
   ```bash
   aws lambda get-function-configuration \
     --function-name alternun-dev-nestjs-api \
     --query 'Environment.Variables'
   ```
2. If missing, check:
   - ✅ `.env` file in `packages/infra/` has the vars
   - ✅ Or GitHub Actions secret was set correctly
   - ✅ Or manual deploy command exported the vars
3. Redeploy:
   ```bash
   export GOOGLE_AUTH_CLIENT_ID="..."
   export GOOGLE_AUTH_CLIENT_SECRET="..."
   export ALTERNUN_TESTNET_MODE=on
   set -a
   source apps/mobile/.env.development
   set +a
   pnpm infra:deploy:dev
   pnpm infra:deploy:dashboard-dev
   ```

### Google login redirects back to `/auth` with error

**Cause**: One of the following:

- Google callback URL not registered in Google Cloud Console
- Redirect URI doesn't match exactly (trailing slash, protocol, domain)
- Frontend is not sending the session cookie to the API

**Fix**:

1. **Verify Google Console settings**:
   - Redirect URI must be **exactly**: `https://testnet.api.alternun.co/auth/callback/google`
   - No trailing slash, correct protocol/domain
2. **Check CORS**:
   ```bash
   curl -i -H "Origin: https://testnet.airs.alternun.co" \
     https://testnet.api.alternun.co/auth/session
   ```
   Should return `Access-Control-Allow-Origin: https://testnet.airs.alternun.co` or `*`
3. **Check client config**:
   - Frontend should have `EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co`
   - It should call the auth handler with `credentials: 'include'`

### Session cookie not set or lost

**Cause**: Cookie domain mismatch between `airs.alternun.co` (frontend) and `api.alternun.co` (API).

**Fix**:

- Better Auth now sets cookies with `Domain: .alternun.co` (the parent domain)
- This allows both subdomains to read the same session cookie
- **Verify**: Reload page, check DevTools Cookies, confirm domain is `.alternun.co`

### Discord button missing on testnet

**Cause**: Authentik social login mode is still set to `supabase` instead of `authentik`.

**Fix**:

- Check the API environment:
  ```bash
  aws lambda get-function-configuration \
    --function-name alternun-dev-nestjs-api \
    --query 'Environment.Variables.EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE'
  ```
- Should return `authentik` (shows Discord)
- If missing, add to deployment environment:
  ```bash
  export EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik
  set -a
  source apps/mobile/.env.development
  set +a
  pnpm infra:deploy:dev
  pnpm infra:deploy:dashboard-dev
  ```

---

## Architecture Diagram

```
┌─────────────────────────────────┐
│  testnet.airs.alternun.co       │ (Frontend: Expo SPA)
│  https://testnet.airs.abc.co    │
└────────────────┬────────────────┘
                 │
         POST /auth/callback/google
                 │
                 ▼
┌─────────────────────────────────┐
│  testnet.api.alternun.co        │ (API: NestJS Lambda)
│  https://testnet.api.abc.co     │
├─────────────────────────────────┤
│  Better Auth (embedded mode)    │
│  ├─ basePath: /auth             │
│  ├─ baseURL: api.testnet.abc.co │
│  ├─ Google + Discord providers   │ ← GOOGLE_AUTH_CLIENT_ID/SECRET
│  ├─ Social UI mode: authentik    │
│  └─ Email/password              │
└────────────────┬────────────────┘
                 │
         GET https://accounts.google.com/o/oauth2/v2/auth
                 │
                 ▼
         ┌─────────────────┐
         │ Google Accounts │
         │ (OAuth consent) │
         └─────────────────┘
```

---

## Related Documentation

- [LOCAL_DEV_SETUP.md](./LOCAL_DEV_SETUP.md) — Local development with Better Auth
- [ENVIRONMENT_SETUP_SUMMARY.md](./ENVIRONMENT_SETUP_SUMMARY.md) — Full env var reference
- [packages/auth README](../packages/auth/README.md) — Auth package details
- [apps/api README](../apps/api/README.md) — API configuration

---

## Summary

| Stage             | Auth Provider   | Google OAuth  | Discord | Social Login Mode |
| ----------------- | --------------- | ------------- | ------- | ----------------- |
| **Production**    | Authentik       | Via Authentik | Yes     | `authentik`       |
| **Testnet (dev)** | **Better Auth** | **Native**    | **Yes** | `authentik`       |
| **Local dev**     | Better Auth     | Native        | No      | `supabase`        |

---

**Next Steps**:

1. ✅ Set up Google OAuth credentials (Step 1)
2. ✅ Add secrets to AWS Secrets Manager (Step 2)
3. ✅ Add GitHub Actions secrets (Step 3)
4. ✅ Update deployment scripts (Step 4)
5. ✅ Deploy and verify (Step 5)
6. 📞 Troubleshoot if needed (Step 6)
