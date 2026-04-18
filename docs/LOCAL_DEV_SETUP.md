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
cp .env.local.example .env.local

# Edit .env.local if needed (defaults are correct for localhost:8082)
cat .env.local
```

### 2. **Start API Server** (terminal 1)

```bash
# From project root, start the Better-auth backend
# Your local API server should listen on http://localhost:8082
# See your API documentation for startup instructions
```

### 3. **Start AIRS App** (terminal 2)

```bash
cd apps/mobile

# For Expo web (port 8081)
npm run web:local

# Or for native development
npm run dev:native
```

### 4. **Test Login**

Open: **http://localhost:8081**

**Should see:**

- ✅ Email/password form
- ✅ Google button
- ❌ NO Discord button
- ❌ NO CORS errors

---

## Environment Files

### `.env.development` (gitignored, for testnet)

Contains testnet URLs. Used when:

- Deploying with `STACK=dev`
- Running builds with `EXPO_PUBLIC_STAGE=dev`

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=https://testnet.api.alternun.co/auth
EXPO_PUBLIC_SUPABASE_URL=https://rjebeugdvwbjpaktrrbx.supabase.co
EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik  # Shows Discord
```

### `.env.local` (gitignored, for local dev)

Created from `.env.local.example`. Overrides `.env.development` for local development.

```bash
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
# Rest inherits from .env.development
```

**Why separate files?**

- `.env.development`: Testnet config (committed in CI/CD via SSM)
- `.env.local`: Local overrides (developer preference, never committed)
- `.env`: Base config (shared defaults, committed)

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

**Problem**: Auth URL is missing `/auth` suffix.

**Solution**:

1. Check `.env.local` exists:
   ```bash
   ls apps/mobile/.env.local
   ```
2. Verify `EXPO_PUBLIC_BETTER_AUTH_URL` includes `/auth`:
   ```bash
   grep BETTER_AUTH apps/mobile/.env.local
   # Should output: EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
   ```
3. Restart dev server after changing `.env.local`

### **Still Showing Discord Button**

**Problem**: Using testnet config locally, or testnet hasn't been redeployed.

**Solution**:

- For local dev: Ensure `.env.local` has `EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth`
- For testnet: Wait for deployment or check CloudFront cache (hard refresh)

### **API Server Errors**

**Problem**: API server not running on port 8082.

**Solution**:

1. Verify API server is running:
   ```bash
   curl http://localhost:8082/auth/health
   ```
2. Check API documentation for startup commands
3. Ensure no other process is using port 8082:
   ```bash
   lsof -i :8082
   ```

---

## Development Workflow

### **Local Testing**

```bash
# Terminal 1: API server
cd packages/api
npm run dev  # (or your API startup command)

# Terminal 2: Mobile app
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

| Variable                                  | Local                                      | Testnet                                    | Purpose                   |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------- |
| `EXPO_PUBLIC_BETTER_AUTH_URL`             | `http://localhost:8082/auth`               | `https://testnet.api.alternun.co/auth`     | Auth service base URL     |
| `EXPO_PUBLIC_SUPABASE_URL`                | `https://rjebeugdvwbjpaktrrbx.supabase.co` | `https://rjebeugdvwbjpaktrrbx.supabase.co` | User data (same for all)  |
| `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE` | `supabase`                                 | `authentik`                                | Discord button visibility |
| `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER`     | `better-auth`                              | `better-auth`                              | Auth provider to use      |

---

## Files

- [.env.local.example](../../apps/mobile/.env.local.example) — Copy this to `.env.local`
- [.env.development](../../apps/mobile/.env.development) — Testnet config
- [AppAuthProvider.tsx](../../apps/mobile/components/auth/AppAuthProvider.tsx) — URL derivation logic
- [ENVIRONMENT_SETUP_SUMMARY.md](./ENVIRONMENT_SETUP_SUMMARY.md) — Detailed reference
