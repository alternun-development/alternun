# Alternun Agent Guide

Short entry point for all agents. Stable facts only — detailed source of truth lives in repo docs.

## Repo Shape

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

## Start Here

Read these first when orienting to a new task:

- `README.md`
- `docs/README.md`
- `apps/docs/docs/Architecture/overview.md`
- `apps/docs/docs/Architecture/monorepo-and-stack.md`
- `apps/docs/docs/Architecture/security-and-quality.md`
- `docs/contribution-workflow.md`
- `docs/alternun_nestjs_fastify_openapi_blueprint.md`

For subsystem-specific work, read the matching local docs next.

## Key Commands

```bash
pnpm dev:all          # all surfaces concurrently
pnpm lint
pnpm type-check
pnpm test
pnpm build

# Targeted (prefer these before root commands)
pnpm --filter @alternun/api run dev
pnpm --filter @alternun/admin run dev:local
pnpm --filter @alternun/mobile run web:local
```

## Validation Order (smallest first)

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

For targeted changes use the relevant package/app command first, then broaden if the change is cross-cutting.

## Working Rules

- Prefer repository-local documentation over hidden assumptions.
- Keep changes scoped to the relevant surface.
- Never edit generated outputs: `dist/`, `build/`, `coverage/`, `dist-lambda/`.
- If you change behavior, update tests and affected docs in the same change.
- If code and docs disagree, fix the repo — don't add a second explanation.
- If you change issue workflow or labels, update `docs/contribution-workflow.md` too.

## Non-Obvious Rules

- **Auth** = Authentik (OIDC). Never bypass or mock it in integration paths.
- **Data** = Supabase. RLS and authorization live there.
- **Validation** happens at API boundary only — trust internal guarantees.
- **Commits** require husky hooks to pass — fix root cause, never `--no-verify`.
- **Branch flow**: feature → `develop` → `master`. PRs target `develop` unless hotfix.
- **Infra deploys** run via `pnpm infra:deploy:*` — confirm with user before running.
- **Secrets**: `.env.*` files are never committed. Use AWS Secrets Manager in prod.

## Backend Rules

- Preserve validation defaults already in place.
- Keep OpenAPI contracts accurate.
- Validate input at the boundary.
- Authentik is the identity provider.
- Supabase is the data and authorization layer.

## Docs Discipline

- Public-facing architecture → `apps/docs/docs/Architecture/`.
- Internal operating notes → `docs/`.
- If code and docs disagree, fix the repo to match reality.

## Agent Efficiency Rules

- Think first before editing.
- Make the smallest change that solves the request.
- Do not reread files you already read unless they changed.
- Keep updates terse; do not repeat unchanged code or add filler.
- Test before saying the work is done.
- Read only the files you need — load context progressively.
- For broad exploration, delegate to an `Explore` subagent.
- For multi-step implementation, use `Plan` before coding.
- Isolate noisy subtasks into subagents to protect main context.
- Prefer `Glob`/`Grep` over spawning agents for simple searches.
- Store stable project facts in memory files, not in conversation.
