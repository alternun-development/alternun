# Release and Deploy to Testnet

## Overview

The release process creates a new version, but deployment requires a separate step to push code to testnet.

## Why Two Steps?

- `pnpm release:patch` - Updates version in code and creates release commit
- `STACK=api-dev deploy` - Actually deploys the API Lambda code to testnet

**⚠️ Important:** Using `STACK=testnet` only deploys infrastructure, NOT the API Lambda code!

## Complete Release Workflow

### Step 1: Create Release

```bash
pnpm release:patch
# or: pnpm release:minor, pnpm release:major
```

This:

- `pnpm release` / `pnpm release:build` increments the current development build number
- `pnpm release:patch` bumps the semantic patch version and resets the build number to `0`
- Updates the structured branch manifest for that branch
- Rebuilds all packages including API with new version
- Creates release commit
- Creates git tag

If anything fails before the commit is created, the release wrapper restores the version files so a partial version bump does not linger in the working tree.

On `develop`, that creates a `v<version>-dev.<build>` tag and only updates `version.development.json`. `pnpm release -- --promote` switches to the production branch context, updates `package.json` plus `version.production.json`, and tags the stable production version for the merge to `master`.
The workspace package `version` fields stay on the semantic base version; the branch-aware build marker lives in the release manifests.

### Step 2: Deploy API to Testnet

```bash
./scripts/deploy-testnet-api.sh
```

Or manually:

```bash
source scripts/setup-aws-account.sh
APPROVE=true STACK=api-dev packages/infra/scripts/sst-deploy.sh
```

### Step 3: Verify

```bash
curl https://testnet.api.alternun.co/health | jq '.version'
```

Should show the new version number.

## Common Issues

### Version not updating on testnet

**Cause:** Using wrong STACK parameter

- ❌ `STACK=testnet` - Only updates infrastructure
- ✅ `STACK=api-dev` - Updates API Lambda code

### Version shows old number after deploy

This can happen due to:

1. Lambda instances serving cached code - multiple instances, some old
2. Cold start delay - new instances starting up
3. API Gateway caching - try `curl --no-cache` or add cache-busting header

**Solution:** Wait 30-60 seconds for all instances to update, then retry.

## One-Command Release (Alternative)

If you want everything in one go:

```bash
pnpm release:patch && ./scripts/deploy-testnet-api.sh --no-prompt
```

This releases and immediately deploys to testnet.
