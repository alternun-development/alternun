# Expo Web Deployment to AWS (`airs.alternun.co`)

This repository deploys Expo Web through `packages/infra` using SST and `@lsts_tech/infra`.

## Targets

- Production stage (`master`): `https://airs.alternun.co`
- Dev stage (`develop`): `https://testnet.airs.alternun.co`

## 1. Prepare Environment

```bash
cp packages/infra/.env.example packages/infra/.env
cp packages/infra/config/deployment.config.example.json packages/infra/config/deployment.config.json
```

Set AWS credentials and region for the IAM user with deploy permissions.

## 2. Sync Branches

Current testnet mode:

- `master` is the working branch
- `develop` is the mirrored branch for the dev/testnet pipeline
- every push to `master`/`main` is mirrored into `develop` by GitHub Actions

Manual sync remains available when needed.

Only when working tree is clean:

```bash
pnpm --filter @alternun/infra run sync:master-develop
```

If fast-forward fails, resolve the branch divergence before pushing again. The automated sync is intentionally fast-forward-only.

## 3. Deploy Dev

```bash
pnpm --filter @alternun/infra run deploy:dev
```

## 4. Deploy Production

```bash
pnpm --filter @alternun/infra run deploy:production
```

## 5. Ensure Pipelines (Optional)

```bash
APPROVE=true pnpm --filter @alternun/infra run ensure:pipelines
```

## Notes

- `packages/infra/infra.config.ts` is Expo-web-first (no Next.js site deploy).
- Local business config can live in `packages/infra/config/deployment.config.json` (gitignored).
- Environment variables override local JSON config values.
- Dev-stage redirects are supported through infra config:
  - `airs.alternun.co` -> `testnet.airs.alternun.co`
  - `dev.airs.alternun.co` -> `testnet.airs.alternun.co`
  - `demo.airs.alternun.co` -> `testnet.airs.alternun.co`
  - `beta.airs.alternun.co` -> `testnet.airs.alternun.co`
  - `alternun.co` -> `alternun.io`
  - When multiple `airs` aliases are enabled, infra provisions a wildcard `*.airs.alternun.co` ACM cert for that redirect group.
- Root `.env` local flag:
  - `ALTERNUN_TESTNET_MODE=on`
- CI uses the same mode through GitHub Actions (default `on` unless repository variable `ALTERNUN_TESTNET_MODE` disables it).
