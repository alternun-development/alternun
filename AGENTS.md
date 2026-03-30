# Alternun Agent Guide

This file is the short entry point for agents working in this repository.
Keep it compact. The detailed source of truth lives in repo docs.

## Start Here

Read these first when orienting yourself:

- `README.md`
- `docs/README.md`
- `apps/docs/docs/Architecture/overview.md`
- `apps/docs/docs/Architecture/monorepo-and-stack.md`
- `apps/docs/docs/Architecture/security-and-quality.md`
- `docs/contribution-workflow.md`
- `docs/alternun_nestjs_fastify_openapi_blueprint.md`

If the task is about a specific subsystem, read the matching local docs next.

## Repo Shape

- `apps/mobile` is the main AIRS client surface.
- `apps/admin` is the internal admin console.
- `apps/api` is the NestJS + Fastify backend.
- `apps/docs` is the public docs site.
- `apps/web` is a secondary web surface.
- `packages/*` contains shared libraries and tooling.
- `packages/infra` owns deployment and pipeline code.

## Working Rules

- Prefer repository-local documentation over hidden assumptions.
- If a decision matters, encode it in `docs/` or `apps/docs/docs/`.
- Keep changes scoped to the relevant surface.
- Do not edit generated build outputs such as `dist/`, `build/`, `coverage/`, or `dist-lambda/`.
- If you change behavior, update tests and any affected docs in the same change.
- If you change issue workflow or labels, update `docs/contribution-workflow.md` and the public contribution docs together.

## Backend Rules

For API work:

- preserve the validation defaults already in place
- keep OpenAPI contracts accurate
- validate input at the boundary
- treat Authentik as the identity provider
- treat Supabase as the data and authorization layer

## Validation

Use the smallest useful verification set first, then broaden if needed:

- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

For targeted changes, prefer the relevant package/app command, then run the root checks above if the change is cross-cutting.

## Docs Discipline

- Public-facing architecture belongs in `apps/docs/docs/Architecture/`.
- Internal operating notes belong in `docs/`.
- If code and docs disagree, fix the repo to match reality rather than adding a second explanation.
