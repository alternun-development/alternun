# Environment Setup - Quick Reference

## TL;DR

- **Local dev:** No setup needed, uses localhost by default
- **Testnet:** Deploy with `STACK=dev` → loads `.env.testnet` automatically
- **Production:** Deploy with `STACK=production` → loads `.env.production` automatically
- **Personal override:** Create `.env.local` with custom values

## File Locations

```
apps/mobile/
├── .env                    # Shared defaults (in repo)
├── .env.development        # Local dev config (create if needed, gitignored)
├── .env.testnet            # Testnet overrides (create, gitignored)
├── .env.production         # Production overrides (create, gitignored)
├── .env.local              # Personal overrides (create, gitignored)
└── build.sh                # Build script that loads .env files
```

## What Each File Contains

| File               | When Used                     | Key URLs                  | Auth Provider |
| ------------------ | ----------------------------- | ------------------------- | ------------- |
| `.env`             | Always (base)                 | `localhost:8082`          | `better-auth` |
| `.env.development` | Local dev (optional)          | `localhost:8082`          | `better-auth` |
| `.env.testnet`     | `STACK=dev` deployment        | `testnet.api.alternun.co` | `better-auth` |
| `.env.production`  | `STACK=production` deployment | `api.alternun.co`         | `supabase`    |
| `.env.local`       | Any (personal)                | Custom values             | Custom        |

## Load Order (Later Files Override Earlier Ones)

```
1. .env (base)
   ↓
2. .env.testnet / .env.production (if STACK set)
   ↓
3. .env.local (if exists)
```

## Common Tasks

### Local Development

```bash
cd apps/mobile
pnpm run build:web
# No configuration needed - uses localhost URLs from .env
```

### Create Local Dev Config (Optional)

```bash
cat > apps/mobile/.env.development << EOF
EXPO_PUBLIC_BETTER_AUTH_URL=http://localhost:8082/auth
AUTH_BETTER_AUTH_URL=http://localhost:8082/auth
EXPO_PUBLIC_AUTH_EXCHANGE_URL=http://localhost:8082/auth/exchange
AUTH_EXCHANGE_URL=http://localhost:8082/auth/exchange
EOF
```

### Deploy to Testnet

```bash
cd packages/infra
STACK=dev pnpm run deploy:dev
# Automatically uses .env.testnet with testnet API URLs
```

### Deploy to Production

```bash
cd packages/infra
STACK=production pnpm run deploy:production
# Automatically uses .env.production with production API URLs
```

### Override Values Locally

```bash
cat > apps/mobile/.env.local << EOF
EXPO_PUBLIC_API_URL=https://custom-backend.example.com
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
EOF
```

## Critical URLs by Stage

### Testnet (.env.testnet)

```
API: https://testnet.api.alternun.co
Auth: https://testnet.api.alternun.co/auth
SSO: https://testnet.sso.alternun.co
Update check interval: 60 seconds
```

### Production (.env.production)

```
API: https://api.alternun.co
Auth: https://api.alternun.co/auth
SSO: https://sso.alternun.co
Update check interval: 300 seconds
```

## Troubleshooting

### "App calling localhost:8082 instead of testnet API"

1. Verify `.env.testnet` exists and has correct URLs
2. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check DevTools Network tab to confirm API endpoint

### "App deployed but seems to use old config"

1. CloudFront cache might be stale
2. Try hard refresh or clear browser cache
3. Check if new bundle was uploaded (check build output for "Exported: dist")

### "Want to test production auth flow locally"

1. Create `.env.local`:

```bash
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER=supabase
EXPO_PUBLIC_BETTER_AUTH_URL=https://api.alternun.co/auth
```

2. Rebuild and test
3. Delete `.env.local` when done

## Variable Categories

### Required for All Stages

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_KEY
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID
EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER
```

### Stage-Specific (in .env.testnet / .env.production)

```
EXPO_PUBLIC_BETTER_AUTH_URL
AUTH_BETTER_AUTH_URL
EXPO_PUBLIC_AUTH_EXCHANGE_URL
AUTH_EXCHANGE_URL
EXPO_PUBLIC_AUTHENTIK_ISSUER
EXPO_PUBLIC_AUTHENTIK_CLIENT_ID
EXPO_PUBLIC_RELEASE_CHECK_INTERVAL_MS
```

## How It Works

```
Deploy: STACK=dev pnpm run deploy:dev
        ↓
build.sh runs:
- Loads .env (base config with localhost URLs)
- Detects STACK=dev
- Loads .env.testnet (overrides URLs to testnet)
- Loads .env.local if it exists (personal overrides)
        ↓
Expo build with resolved environment variables
        ↓
App deployed with correct testnet API URLs
```

## Files to Never Edit

❌ Don't edit these committed files for deployment:

- `.gitignore` - Unless adding new patterns
- `build.sh` - Unless changing build process
- `mobile-env.cjs` - Unless changing how env vars are resolved

✅ Do edit these for your stage:

- `.env.testnet` - For testnet configuration
- `.env.production` - For production configuration
- `.env.local` - For personal testing

## References

- Full documentation: [ENV_SETUP.md](ENV_SETUP.md)
- Build script: [build.sh](build.sh)
- Environment extraction: [scripts/mobile-env.cjs](scripts/mobile-env.cjs)
