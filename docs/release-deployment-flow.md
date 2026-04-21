# Complete Release and Deployment Flow

This document explains the entire release and deployment process from `pnpm release:patch` through testnet update.

For production promotion, see `docs/release-promotion-process.md`.

## Overview

The release flow is **now fully automated**:

```
pnpm release:patch  →  git tag created  →  GitHub Actions  →  Build  →  Deploy to testnet
```

## Step-by-Step Flow

### 1. Local Release (Developer)

```bash
pnpm release:patch
# or: pnpm release:minor, pnpm release:major
```

This command:

- `pnpm release` / `pnpm release:build` increments the current development build number
- `pnpm release:patch` bumps the semantic patch version and resets the build number to `0`
- `pnpm release:minor` / `pnpm release:major` bump the semantic version and reset the build number to `0`
- Updates the structured release manifest for the current branch
- Rebuilds all packages with the new version
- Updates `CHANGELOG.md`
- Creates a release commit (e.g., "chore: release v1.0.164")
- Creates an annotated git tag (e.g., "v1.0.164")
- Pushes commit and tag to remote

If the release fails before the commit step, the version files are restored so the working tree does not keep a half-applied release version.

On `develop`, the release stays on the development manifest and produces a `-dev` tag. `pnpm release:patch:promote` uses the production branch context instead, writes `package.json` plus `version.production.json`, and creates the stable production tag.
Workspace package versions remain on the semantic base release version; only the branch manifests carry the `-dev` or production build marker.

**Result:** Git tag `v1.0.164` is created and pushed to GitHub

### 2. GitHub Actions Trigger

The `.github/workflows/release-deploy.yml` workflow automatically triggers when a tag matching `v*.*.*` is pushed.

**Trigger condition:** `push.tags: ['v*.*.*']`

### 3. Automated Pipeline

The workflow runs in the AWS CodeBuild environment and:

#### 3.1 Install dependencies

```bash
pnpm install
```

#### 3.2 Build all packages

```bash
pnpm build
```

This builds:

- Frontend apps (web, mobile, docs, admin)
- Backend API with **version injection** via esbuild:
  - Extracts version from the current branch version source, or the promoted production branch when `--promote` is used
  - Passes to esbuild: `--define:__VERSION__="<current branch version>"`
  - Injects into `dist-lambda/lambda.js`

#### 3.3 Deploy to testnet

```bash
cd packages/infra
INFRA_ENABLE_BACKEND_API=true npx sst deploy --stage api-dev --continue
```

**Critical environment variable:** `INFRA_ENABLE_BACKEND_API=true`

- Without this, the API Lambda won't deploy
- Without this, the SST stack thinks the API is disabled and may refuse to deploy

#### 3.4 Verify deployment

```bash
curl https://testnet.api.alternun.co/health | jq '.version'
```

Should return the new version (e.g., `"1.0.164"`)

**Note:** Lambda warm-up may take 10-30 seconds. If version doesn't match immediately:

- Workflow retries after 30 seconds
- You can manually check later if needed

## Why INFRA_ENABLE_BACKEND_API=true is Required

The SST stack has multiple deployment modes:

| STACK value     | Deploys              | Notes                                       |
| --------------- | -------------------- | ------------------------------------------- |
| `api-dev`       | API Lambda code      | ✓ Only with `INFRA_ENABLE_BACKEND_API=true` |
| `testnet`       | Infrastructure only  | ✗ Does NOT deploy Lambda code               |
| `dashboard-dev` | Infrastructure + API | ✓ Includes backend API resources            |

**Without the flag:** The deployment creates/updates infrastructure but skips the API Lambda code update.

## Complete Release Checklist

✓ Code is committed and staged
✓ `pnpm release:patch` bumps version
✓ Git commit created: "chore: release v1.0.164"
✓ Git tag created: "v1.0.164"
✓ Tag pushed to GitHub
✓ GitHub Actions workflow triggers
✓ All packages built with new version
✓ API Lambda built with `APP_VERSION = "1.0.164"` injected
✓ SST deploys with `INFRA_ENABLE_BACKEND_API=true`
✓ testnet health endpoint returns new version
✓ All apps updated on testnet

## Version Injection Details

The API version is injected at **build time** via esbuild:

1. **build.sh** extracts version from the branch-aware release source:

   ```bash
   VERSION=$(node -e "const { readRootVersion, resolveVersionContextBranch } = require('../../scripts/versioning/version-files.cjs'); process.stdout.write(readRootVersion(resolveVersionContextBranch()));")
   ```

2. **esbuild** receives the version:

   ```bash
   esbuild ... --define:__VERSION__="1.0.164" ...
   ```

3. **app-metadata.ts** declares it:

   ```typescript
   declare const __VERSION__: string;
   export const APP_VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0';
   ```

4. **Compiled output** becomes:

   ```javascript
   exports2.APP_VERSION = true ? '1.0.164' : '1.0.0';
   ```

5. **health.controller.ts** returns it:
   ```typescript
   version: APP_VERSION; // Returns "1.0.164"
   ```

## Manual Deployment (if needed)

If the automated pipeline fails or you need to deploy manually:

```bash
# Rebuild the API with the current branch version
pnpm build --filter @alternun/api

# Deploy to testnet with backend API enabled
source scripts/setup-aws-account.sh
cd packages/infra
APPROVE=true INFRA_ENABLE_BACKEND_API=true npx sst deploy --stage api-dev

# Verify
curl https://testnet.api.alternun.co/health | jq '.version'
```

## Troubleshooting

### Workflow didn't trigger

- Check that a tag matching `v*.*.*` was pushed
- Verify in GitHub: Settings → Actions → All workflows → "Release and Deploy to Testnet"

### Version didn't update on testnet

- **Problem:** Lambda instances still serving old code
- **Solution:** Wait 30-60 seconds, Lambda instances recycle automatically
- **Alternative:** Manually invoke or check CloudWatch logs

### Deployment failed

- Check GitHub Actions logs for the specific error
- Common issue: Missing `INFRA_ENABLE_BACKEND_API=true` flag
- Review `.github/workflows/release-deploy.yml`

### "Backend API is disabled"

- The SST deployment is running, but API Lambda wasn't deployed
- **Fix:** Ensure workflow has `INFRA_ENABLE_BACKEND_API: 'true'`
- This is already configured in the workflow

## Summary

The **complete flow is now automated**:

- Release patch creates a version tag
- GitHub Actions detects the tag
- Pipeline builds, tests, and deploys to testnet
- Everything is updated: API, version display, all app code
- No manual intervention needed

The key enabler is the `INFRA_ENABLE_BACKEND_API=true` flag in the workflow, which ensures the API Lambda code is deployed alongside the infrastructure.
