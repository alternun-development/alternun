# @alternun/infra

AWS/SST deployment wrapper for Alternun Expo Web using `@lsts_tech/infra`.

## Stage Domains

- `production` -> `airs.alternun.co`
- `dev` -> `testnet.airs.alternun.co`
- `mobile` (optional) -> `preview.airs.alternun.co`

## Redirects (Dev Stage)

During `dev` deployments, infra can provision:

- `airs.alternun.co` -> `testnet.airs.alternun.co`
- `dev.airs.alternun.co` -> `testnet.airs.alternun.co`
- `alternun.co` -> `alternun.io`

Config knobs:

- `INFRA_REDIRECT_AIRS_TO_DEV`
- `INFRA_REDIRECT_DEV_TO_TESTNET`
- `INFRA_REDIRECT_DEV_TO_TESTNET_SOURCE`
- `INFRA_REDIRECT_DEV_TO_TESTNET_CERT_ARN` (optional)
- `INFRA_REDIRECT_ROOT_DOMAIN`
- `INFRA_REDIRECT_ROOT_TARGET`
- `INFRA_REDIRECT_ROOT_CERT_ARN` (optional)

## Why This Package Exists

- Keeps infrastructure code isolated in one workspace package.
- Uses a public reusable orchestrator (`@lsts_tech/infra`).
- Keeps business-specific values out of git by supporting a local config file.

## Local Config (Not Committed)

1. Copy example:

```bash
cp config/deployment.config.example.json config/deployment.config.json
```

2. Optionally point to a custom path:

```bash
export INFRA_CONFIG_PATH=./packages/infra/config/deployment.config.json
```

Environment variables always override local JSON values.

## Branch Promotion (develop -> master)

Run only from a clean working tree:

```bash
pnpm --filter @alternun/infra run sync:develop-master
```

This script does a fast-forward-only promotion:

1. fetches `develop` and `master`
2. fast-forwards `master` from `develop`
3. pushes `master`

## Deploy

From repo root:

```bash
pnpm --filter @alternun/infra run deploy:dev
pnpm --filter @alternun/infra run deploy:production
```

## Pipelines

Create/repair configured pipelines:

```bash
APPROVE=true pnpm --filter @alternun/infra run ensure:pipelines
```

## Required CI/Runtime Env Contract

See [`./.env.example`](./.env.example).

Minimum values to set in CI:

- `AWS_REGION`
- `INFRA_ROOT_DOMAIN`
- `INFRA_PIPELINE_REPO`
- `INFRA_PIPELINES`
- `INFRA_PIPELINE_BRANCH_PROD`
- `INFRA_PIPELINE_BRANCH_DEV`

Optional but recommended:

- `INFRA_CODESTAR_CONNECTION_ARN`
- `INFRA_EXPO_CERT_ARN_PRODUCTION`
- `INFRA_EXPO_CERT_ARN_DEV`
