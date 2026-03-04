# Expo Web Deployment to AWS (`airs.alternun.co`)

This repository deploys Expo Web through `packages/infra` using SST and `@lsts_tech/infra`.

## Targets

- Production stage (`master`): `https://airs.alternun.co`
- Dev stage (`develop`): `https://dev.airs.alternun.co`

## 1. Prepare Environment

```bash
cp packages/infra/.env.example packages/infra/.env
cp packages/infra/config/deployment.config.example.json packages/infra/config/deployment.config.json
```

Set AWS credentials and region for the IAM user with deploy permissions.

## 2. Sync Branches (Fast-Forward)

Only when working tree is clean:

```bash
pnpm --filter @alternun/infra run sync:develop-master
```

If fast-forward fails, open a PR from `develop` into `master` and resolve conflicts there.

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
