# Local Development Setup - Mobile Auth

This guide covers setting up the AIRS mobile app (Expo web) for local development with both local and testnet authentication.

---

## Architecture

**Local Setup (Port 8081 + 8082)**:

```
┌─────────────────────────┐
│  AIRS App (port 8081)   │
│  (Expo web dev)         │
└────────────┬────────────┘
             │
             ├─→ API Server (port 8082)
             │   └─→ Better-auth service
             │
             └─→ Testnet Supabase
                 (for user data)
```

**Testnet Setup**:

```
┌─────────────────────────────────────┐
│  testnet.airs.alternun.co           │
│  (CloudFront distribution)          │
└────────────┬────────────────────────┘
             │
             ├─→ testnet.api.alternun.co
             │   └─→ Better-auth service
             │
             └─→ Testnet Supabase
                 (for user data)
```

---

## Quick Start

### 1. **Set Up Local Environment**

```bash
cd apps/mobile

# Copy the local dev template
cp .env.example .env

# Edit .env if needed (defaults are correct for localhost:8082)
cat .env
```

### 2. **Start the local web stack**

```bash
cd apps/mobile
npm run web:local
```

This starts Expo on `http://localhost:8081` and the API/auth backend on `http://localhost:8082`.

### 3. **Test Login**

Open: **http://localhost:8081**

**Should see:**

- ✅ Email/password form
- ✅ Google button
- ✅ Discord button if your repo-root `.env` includes Discord OAuth creds
- ❌ NO CORS errors

---

## Environment Files

### `.env.development` (gitignored, for testnet)

Contains testnet URLs. Used when:

- Building the testnet bundle with `STACK=dev`
- Running builds with `EXPO_PUBLIC_STAGE=dev`

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
EXPO_PUBLIC_SUPABASE_URL=https://rjebeugdvwbjpaktrrbx.supabase.co
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik  # Shows Discord
```

### `.env` (gitignored, for local dev)

Created from `.env.example`. Overrides `.env.development` for local development.

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
# Rest inherits from .env.development
```

The local API dev server also reads the repo-root `.env` first so shared Better
Auth social credentials like `GOOGLE_AUTH_CLIENT_ID` and
`GOOGLE_AUTH_CLIENT_SECRET` are available during local testing.

**Why separate files?**

- `.env`: Local development source of truth (developer preference, never committed)
- `.env.development`: Testnet config (generated from env sync / SSM)
- `.env.production`: Production config (generated from env sync / SSM)

---

## Single-Source-of-Truth URL Pattern

All auth endpoints are derived from **one variable** per stage:

```typescript
// In AppAuthProvider.tsx
const baseAuthUrl = process.env.EXPO_PUBLIC_BETTER_AUTH_URL;
// E.g., "http://localhost:8082/auth" or "https://testnet.api.alternun.co/auth"

// Endpoints automatically:
// - /sign-in/email
// - /sign-in/social
// - /sign-up/email
// - /exchange
// - etc.
```

**Why?**

- ✅ Change one variable → all endpoints update
- ✅ No scattered hardcoded paths
- ✅ Works for both local and remote

---

## Troubleshooting

### **CORS Error: `localhost:8082/auth/sign-in/social`**

**Problem**: The local API/auth backend is not running, or the app is still pointed at an outdated auth URL.

**Solution**:

1. Start the local stack with:
   ```bash
   cd apps/mobile
   npm run web:local
   ```
2. Check `.env` exists:
   ```bash
   ls apps/mobile/.env
   ```
3. Verify `EXPO_PUBLIC_BETTER_AUTH_URL` includes `/auth`:
   ```bash
   grep BETTER_AUTH apps/mobile/.env
   # Should output: EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
   ```
4. Restart the dev server after changing `.env`

### **Still Showing Discord Button**

**Problem**: Using testnet config locally, or testnet hasn't been redeployed.

**Solution**:

- For local dev: Ensure `.env` has `EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth`
- For testnet: Wait for deployment or check CloudFront cache (hard refresh)

### **API Server Errors**

**Problem**: The API server is not running on port 8082.

**Solution**:

1. Verify the API server is running:
   ```bash
   curl http://localhost:8082/auth/health
   ```
2. If you started only Expo, run `npm run web:local` from `apps/mobile` so the backend starts too.
3. Ensure no other process is using port 8082:
   ```bash
   lsof -i :8082
   ```

---

## Development Workflow

### **Local Testing**

```bash
cd apps/mobile
npm run web:local
# Open http://localhost:8081
```

### **Testing Testnet**

```bash
# No local changes needed
# Just visit https://testnet.airs.alternun.co
# (After latest deployment is live)
```

### **Deploying a Testnet Change**

Use the same stage-aware rollout path that matched the working live deployment:

```bash
set -a
source apps/mobile/.env.development
set +a

pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

Smoke test the live auth route after both deploys complete:

```bash
curl -k -i -X POST -H 'content-type: application/json' \
  -d '{"provider":"google"}' \
  https://testnet.api.alternun.co/auth/sign-in/social

curl -k -i -X POST -H 'content-type: application/json' \
  -d '{"provider":"discord"}' \
  https://testnet.api.alternun.co/auth/sign-in/social
```

Use `pnpm release patch` only when you need a versioned release; it is not the preferred path for live testnet auth changes.

---

## Environment Variable Reference

| Variable                                  | Local                                      | Testnet                                    | Purpose                    |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------- |
| `EXPO_PUBLIC_BETTER_AUTH_URL`             | `http://localhost:8082/auth`               | `https://testnet.api.alternun.co/auth`     | Auth service base URL      |
| `EXPO_PUBLIC_SUPABASE_URL`                | `https://rjebeugdvwbjpaktrrbx.supabase.co` | `https://rjebeugdvwbjpaktrrbx.supabase.co` | User data (dev/testnet DB) |
| `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE` | `supabase`                                 | `authentik`                                | Discord button visibility  |
| `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER`     | `better-auth`                              | `better-auth`                              | Auth provider to use       |

---

## Files

- [.env.example](../../apps/mobile/.env.example) — Copy this to `.env`
- [.env.development](../../apps/mobile/.env.development) — Testnet config
- [AppAuthProvider.tsx](../../apps/mobile/components/auth/AppAuthProvider.tsx) — URL derivation logic
- [ENVIRONMENT_SETUP_SUMMARY.md](./ENVIRONMENT_SETUP_SUMMARY.md) — Detailed reference
