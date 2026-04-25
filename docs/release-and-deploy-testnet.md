# Release and Deploy to Testnet

## Overview

`pnpm release:patch` updates the version metadata. Deploying the live testnet API/auth runtime is a separate step and must target `dashboard-dev`.

## Why Two Steps?

- `pnpm release:patch` updates versioning and creates the release commit/tag
- `STACK=dashboard-dev deploy` updates the live testnet API/admin runtime

Important:

- `STACK=testnet` only deploys infrastructure for the primary app stack
- `STACK=api-dev` is retired and must not be used

## Complete Release Workflow

### Step 1: Create Release

```bash
pnpm release:patch
```

This updates the branch release manifest, rebuilds packages, and creates the release commit/tag.

### Step 2: Deploy the Live Testnet API/Admin Runtime

```bash
./scripts/deploy-testnet-api.sh
```

Or manually:

```bash
source scripts/setup-aws-account.sh
APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh
```

### Step 3: Verify

```bash
curl https://testnet.api.alternun.co/health | jq '.version'
```

## Common Issues

### Version not updating on testnet

Cause: wrong stack target

- `STACK=testnet` only updates infrastructure
- `STACK=api-dev` is a retired stale stage path
- `STACK=dashboard-dev` is the correct live testnet API/auth target

### Version shows the old number after deploy

- wait 30-60 seconds for propagation
- retry the health check

## One-Command Release

```bash
pnpm release:patch && ./scripts/deploy-testnet-api.sh --no-prompt
```

This releases and then deploys the live testnet API/auth runtime through `dashboard-dev`.
