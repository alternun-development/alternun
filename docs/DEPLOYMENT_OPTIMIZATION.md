# Deployment Optimization Guide

The dev deployment typically takes **10-15 minutes**. This breakdown shows where time is spent and how to optimize.

## Deployment Time Breakdown

| Phase                | Time      | Bottleneck                                |
| -------------------- | --------- | ----------------------------------------- |
| **Turbo Build**      | 2-3 min   | TypeScript compilation, esbuild bundling  |
| **AWS Provisioning** | 10-12 min | SST creating/updating Lambda, API Gateway |
| **Deploy Upload**    | 1-2 min   | Code upload to Lambda                     |

## Quick Wins (Immediate)

### 1. Skip Unnecessary Rebuilds

Turbo caches builds. Avoid full clean rebuilds:

```bash
# ❌ Slow - clears all cache
pnpm clean && pnpm build

# ✅ Fast - uses incremental cache
pnpm build  # Only rebuilds changed packages
```

### 2. Target Only Changed Packages

If only API changed, don't rebuild everything:

```bash
# Only build API and dependencies
pnpm --filter @alternun/api build

# Deploy (skips mobile, docs, admin)
APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

### 3. Skip Migrations on Rapid Iteration

Migrations add 2-3 minutes. Skip during development:

```bash
# Deploy WITHOUT running migrations (faster)
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"

source scripts/setup-aws-account.sh
export INFRA_BACKEND_API_DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id alternun/api/database-url \
  --query SecretString --output text)

APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh
```

### 4. Use Local Dev Instead of Deploy

For code changes, test locally first:

```bash
# Fast local testing (no AWS)
pnpm --filter @alternun/api run dev

# Only deploy when ready
bash scripts/deploy-with-migrations.sh
```

## Medium-Term Optimizations

### 1. Incremental TypeScript Compilation

Update `apps/api/tsconfig.build.json`:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

Saves ~1-2 minutes on rebuilds.

### 2. Optimize esbuild Configuration

`apps/api/build.sh` can be faster with:

```bash
# Add watch mode for iterative builds
esbuild ... --watch  # Rebuild only changed files
```

Saves ~30 seconds per rebuild.

### 3. Parallelize Turbo Tasks

Add to `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "cache": true,
      "parallel": true
    }
  }
}
```

## Deployment Strategy by Use Case

### Local Development (No Deploy)

```bash
# Just start dev server locally
pnpm --filter @alternun/api run dev

# Time: ~5 seconds
```

### Testing Auth Changes (Cached)

```bash
# Build only API, skip migrations
export INFRA_BACKEND_API_MIGRATIONS_ENABLED="false"
source scripts/setup-aws-account.sh
export INFRA_BACKEND_API_DATABASE_URL=$(...)

APPROVE=true STACK=dev packages/infra/scripts/sst-deploy.sh

# Time: ~6-8 minutes
```

### First Full Deploy (Fresh)

```bash
# Clean build with migrations
pnpm clean && bash scripts/deploy-with-migrations.sh

# Time: ~15-20 minutes
```

### Production Deploy (Cached + Migrations)

```bash
# Full validation with migrations
bash scripts/deploy-with-migrations.sh

# Time: ~12-15 minutes
```

## Monitoring Build Performance

```bash
# Time the full build
time pnpm build

# Profile specific package
time pnpm --filter @alternun/api build

# Check Turbo cache
pnpm build --verbose | grep -i "cache"
```

## Recommended Workflow

**Daily Development:**

1. Code locally → `pnpm dev` (5 sec)
2. Test locally → Manual testing (1 min)
3. When ready → Deploy with `bash scripts/deploy-with-migrations.sh` (12 min)

**Quick Iterations:**

1. Change code
2. `pnpm --filter @alternun/api build` (30 sec)
3. Deploy with `MIGRATIONS_ENABLED=false` (6 min)
4. Test on testnet
5. Full deploy when complete (12 min)

**Zero-Downtime:** Use canary deployments

1. Deploy to `dev-canary` first (8 min)
2. Test thoroughly
3. If good, promote to `dev` (5 min)

## Time Savings Summary

| Strategy                   | Time    | Savings  |
| -------------------------- | ------- | -------- |
| Full deploy (cached)       | 12 min  | Baseline |
| Skip migrations            | 9 min   | -3 min   |
| Local dev only             | 1 min   | -11 min  |
| Incremental TS + cache     | 10 min  | -2 min   |
| All optimizations combined | 6-8 min | -4-6 min |

## Next Steps

- [ ] Run `time bash scripts/deploy-with-migrations.sh` to profile
- [ ] Try `MIGRATIONS_ENABLED=false` deploy (should be ~7-8 min)
- [ ] Use local dev instead of deploy for testing
- [ ] Add incremental TypeScript compilation
- [ ] Set up canary deployment strategy
