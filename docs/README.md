# Alternun Internal Docs Index

This directory is the internal knowledge base for Alternun.

Use it for material that should stay close to the codebase:

- architecture decisions
- implementation blueprints
- execution plans
- incident reports and regression writeups
- issue specs
- workflow and operating notes

Public-facing technical documentation lives in `apps/docs/docs/`.

## Recommended Reading Order

1. `docs/contribution-workflow.md`
2. `docs/alternun_nestjs_fastify_openapi_blueprint.md`
3. `docs/alternun-identity-architecture-decision.md`
4. `docs/alternun-identity-infrastructure-issue.md`
5. `docs/alternun-identity-infrastructure-execution-plan.md`
6. `docs/refine_admin_integration_issue.md`
7. `docs/alternun-authentik-social-login-incident-2026-04.md`

## How To Use This Directory

- Keep each document focused on one decision or workstream.
- Prefer an explicit acceptance shape when a doc describes implementation work.
- Add links to the related code paths and any public docs pages that should stay in sync.
- Update the internal doc when the code changes the decision, not after drift accumulates.

## Common Document Types

- `*-blueprint.md` for architecture proposals
- `*-decision.md` for settled decisions
- `*-incident-*.md` for incident and regression writeups
- `*-issue.md` for implementation specs and backlog items
- `*-execution-plan.md` for ordered delivery plans
- `contribution-workflow.md` for maintainer process

## Maintenance Rule

If a document stops matching reality, treat that as a repo maintenance task.
Either update the doc or replace it with a better source of truth.
