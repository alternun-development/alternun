# Complete Release and Deployment Flow

This document explains the current release and deployment path from `pnpm release:patch` through testnet update.

For production promotion, see `docs/release-promotion-process.md`.

## Overview

The release/version flow and the live testnet deploy flow are separate:

```text
pnpm release:patch -> version/tag update -> branch-based AWS pipelines or explicit stage-aware deploys
```

Current live testnet ownership:

- `dev` owns the Expo bundle at `testnet.airs.alternun.co`
- `dashboard-dev` owns the live API/admin runtime at `testnet.api.alternun.co` and `testnet.admin.alternun.co`
- `identity-dev` owns Authentik at `testnet.sso.alternun.co`

Retired stage names such as `api-dev` and `backend-*` must not be used for live testnet API deploys.

## Step-by-Step Flow

### 1. Local Release

```bash
pnpm release:patch
# or: pnpm release:minor, pnpm release:major
```

This command:

- updates the current branch release manifest
- bumps the semantic version for patch/minor/major releases
- rebuilds packages with the new version
- creates the release commit and tag

On `develop`, the tag/version metadata stays on the development manifest. `pnpm release:patch:promote` handles the production promotion flow.

### 2. Deploy to Live Testnet

For the live testnet API/auth runtime:

```bash
pnpm infra:deploy:dashboard-dev
```

For testnet bundle changes that must stay aligned with the API/auth runtime:

```bash
pnpm infra:deploy:dev
pnpm infra:deploy:dashboard-dev
```

The disabled `.github/workflows/release-deploy.yml` file is reference-only. The active deploy path is the stage-aware AWS pipeline or an explicit `dashboard-dev` deploy.

### 3. Verify

Verify the live API:

```bash
curl https://testnet.api.alternun.co/health | jq '.version'
```

Verify the live social sign-in bootstrap:

```bash
curl -k -i -X POST https://testnet.api.alternun.co/auth/sign-in/social \
  -H 'content-type: application/json' \
  --data '{"provider":"google","callbackURL":"https://testnet.airs.alternun.co/auth/callback","errorCallbackURL":"https://testnet.airs.alternun.co/auth/callback","newUserCallbackURL":"https://testnet.airs.alternun.co/auth/callback"}'
```

Expected result:

- `200` response
- Google redirect URL in the payload
- `Set-Cookie: __Secure-better-auth.state=...`

## Stack Guide

| `STACK value`   | Purpose                        | Notes                                       |
| --------------- | ------------------------------ | ------------------------------------------- |
| `dashboard-dev` | Live testnet API/admin runtime | Correct owner for `testnet.api.alternun.co` |
| `dev`           | Testnet Expo bundle            | User-facing AIRS web bundle                 |
| `identity-dev`  | Testnet Authentik              | Identity runtime                            |
| `api-dev`       | Retired                        | Stale stage path; do not use                |

## Manual Deploy

If you need to deploy manually:

```bash
source scripts/setup-aws-account.sh
APPROVE=true STACK=dashboard-dev packages/infra/scripts/sst-deploy.sh
```

## Troubleshooting

### Version did not change on testnet

- verify that `dashboard-dev` was the deploy target
- wait 30-60 seconds for Lambda/API Gateway propagation
- re-check `https://testnet.api.alternun.co/health`

### Social login still fails

- confirm `POST /auth/sign-in/social` returns the Better Auth state cookie
- confirm the callback URL is `https://testnet.airs.alternun.co/auth/callback`
- do not use `testflight.alternun.io` as the Better Auth callback URL unless the runtime explicitly trusts it

### Someone used `api-dev`

- `api-dev` is retired
- use `dashboard-dev` instead
- if stale resources reappear, remove the stale stage and re-deploy `dashboard-dev`

## Summary

- `release:patch` manages versioning
- `dashboard-dev` is the single correct live testnet API/admin stack
- `dev` is the testnet bundle stack
- `identity-dev` is the testnet identity stack
