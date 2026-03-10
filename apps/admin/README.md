# @alternun/admin

Internal Refine-based admin frontend for Alternun.

## Purpose

- authenticate internal operators against Authentik
- consume the NestJS backend API in `apps/api`
- provide CRUD-heavy admin flows without introducing a second backend platform

## Local development

```bash
cp .env.example .env
pnpm --filter @alternun/admin install
pnpm --filter @alternun/admin run dev
```

The app expects:

- `VITE_API_URL`
- `VITE_AUTH_ISSUER`
- `VITE_AUTH_CLIENT_ID`
- `VITE_AUTH_AUDIENCE`
- `VITE_ALLOWED_ADMIN_EMAIL_DOMAIN`
- `VITE_APP_ENV`

## Deployment

Admin deploys are managed from `packages/infra` using dedicated stacks:

- `admin-dev`
- `admin-prod`

Those stacks build the static site and publish it through the same SST/CodeBuild pipeline system used elsewhere in the repo.
