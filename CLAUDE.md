# Alternun — Claude Context

## What This Repo Is

Turborepo monorepo (pnpm workspaces). Stack: NestJS + Fastify (API), Expo (mobile), Next.js (admin/web), Docusaurus (docs). Auth via Authentik (OIDC). Data via Supabase.

## Apps & Packages

| Path             | Name               | Role                      |
| ---------------- | ------------------ | ------------------------- |
| `apps/api`       | `@alternun/api`    | NestJS + Fastify backend  |
| `apps/mobile`    | —                  | Expo / AIRS client        |
| `apps/admin`     | `@alternun/admin`  | Internal admin console    |
| `apps/web`       | —                  | Secondary web surface     |
| `apps/docs`      | `alternun-docs`    | Public Docusaurus site    |
| `packages/ui`    | —                  | Shared component library  |
| `packages/infra` | `@alternun/infra`  | Deploy + pipeline scripts |
| `packages/auth`  | `@edcalderon/auth` | Auth helpers (Authentik)  |
| `packages/i18n`  | —                  | Shared translations       |

## Key Commands

```bash
pnpm dev:all          # all surfaces concurrently
pnpm lint             # lint all packages
pnpm type-check       # TypeScript across monorepo
pnpm test             # run all tests
pnpm build            # full production build

# Targeted (prefer these first)
pnpm --filter @alternun/api run dev
pnpm --filter @alternun/admin run dev:local
pnpm --filter @alternun/mobile run web:local
```

## Non-Obvious Rules

- **Never edit** `dist/`, `build/`, `coverage/`, `dist-lambda/` — generated outputs.
- **Auth** = Authentik (OIDC). Never bypass or mock it in integration paths.
- **Data** = Supabase. RLS and authorization live there.
- **Validation** happens at API boundary only — trust internal guarantees.
- **Commits** require `husky` hooks to pass — fix root cause, never `--no-verify`.
- **Branch flow**: feature → `develop` → `master`. PRs target `develop` unless hotfix.
- **Infra deploys** run via `pnpm infra:deploy:*` scripts — confirm with user before running.
- **Secrets**: `.env.*` files are never committed. Use AWS Secrets Manager in prod.

## Validation Order (smallest first)

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Docs Pointers

- Architecture: `apps/docs/docs/Architecture/`
- Internal ops: `docs/`
- API blueprint: `docs/alternun_nestjs_fastify_openapi_blueprint.md`
- Contribution workflow: `docs/contribution-workflow.md`

## Agent Efficiency Rules

- Read only the files you need — load context progressively.
- For broad exploration, delegate to an `Explore` subagent.
- For multi-step implementation, use `Plan` before coding.
- Isolate noisy subtasks into subagents to protect main context.
- Prefer `Glob`/`Grep` over spawning agents for simple searches.
- Store stable project facts in memory files, not in conversation.
