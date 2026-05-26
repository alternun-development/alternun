# Release and Deploy to Testnet

## Overview

`pnpm release:patch` updates the version metadata and now deploys the live testnet API/auth runtime automatically through `dashboard-dev`.

## Why This Changed?

- `pnpm release:patch` updates versioning, creates the release commit/tag, and deploys the live testnet API/admin runtime
- `STACK=dashboard-dev` remains the owning deploy target under the hood

Important:

- `STACK=testnet` only deploys infrastructure for the primary app stack
- `STACK=api-dev` is retired and must not be used

## Complete Release Workflow

### Step 1: Create Release

```bash
pnpm release:patch
```

This updates the branch release manifest, rebuilds packages, creates the release commit/tag,
and deploys the live testnet API/admin runtime through `dashboard-dev`.

### Step 2: Verify

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
pnpm release:patch
```

The release command already hands off to the live testnet API/auth runtime owned by `dashboard-dev`.
