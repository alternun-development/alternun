---
sidebar_position: 5
---

# Security and Quality

Security in this repo is a combination of runtime controls, infrastructure guardrails, and development workflow discipline.

The important point for contributors is this:

**quality is not one tool**. It is a chain of controls across application code, identity, deployment, and review.

## Security Model Today

### Identity boundary

The current architecture direction is:

- Authentik is the identity provider
- Supabase remains a data and authorization layer
- app and admin clients do not become their own identity source of truth

This is a good separation because it keeps authentication ownership explicit.

### API input handling

The NestJS API already enables important validation defaults:

- `ValidationPipe`
- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

Those defaults reduce common input-shape mistakes and accidental over-posting.

### Secrets and environment handling

The repo also has infra-first environment handling:

- environment-first deploy scripts
- Secrets Manager integration in the identity stack
- stage-aware configuration
- deployment guards around stack types and pipeline reconciliation

## Quality Controls In The Repo

### Static quality controls

- TypeScript across apps and packages
- ESLint
- Prettier
- `lint-staged`
- Husky pre-commit and pre-push hooks
- `eslint-plugin-security`

### Validation and release controls

- version validation scripts
- secret scanning hooks
- Turbo-based `build`, `lint`, `type-check`, and `test` orchestration
- branch and pipeline safety scripts in `packages/infra/scripts`

### Documentation and API quality

- Docusaurus docs are built from the same monorepo
- the API exposes Swagger / OpenAPI docs
- operational docs already exist in-repo for identity and infra decisions

## Contributor Checklist

When changing code in this repo, contributors should actively check:

1. **Input validation**: does the endpoint or function strictly validate shape and type?
2. **Secret handling**: is any secret leaking into client-side code, logs, or committed files?
3. **Auth boundary**: is the change respecting the existing identity model instead of bypassing it?
4. **Stage awareness**: does the change behave correctly in dev, production, and preview/testnet contexts?
5. **Infra safety**: could the change cause destructive deployment side effects?
6. **Docs impact**: does the public or operator-facing behavior need documentation updates?

## Current Strengths

These are already positive signals in the repository:

- clear separation between public app, admin, docs, API, and infra
- identity treated as a dedicated subsystem
- infrastructure managed as code
- release automation present in the monorepo
- shared packages used instead of uncontrolled duplication
- public docs site already part of the platform

## Known Gaps And Risks

The current architecture is solid enough to grow, but several gaps are still visible.

### 1. API security posture needs tightening

Examples:

- CORS is currently permissive in the Nest bootstrap
- the custom API surface is still early and needs broader policy hardening
- more endpoint-level auth and authorization coverage will be needed as the API grows

### 2. Test coverage is uneven

Some parts of the repo have testing patterns, but coverage is not yet equally mature across every app and service.

### 3. Observability is still light

The AWS runtime includes logs, but the platform still needs a richer operational story around:

- structured tracing
- service-level dashboards
- alerting
- deployment-level health visibility

### 4. Security automation can go further

Good foundations exist, but the repo would benefit from more formalized:

- dependency review
- SBOM generation
- artifact provenance
- container and image scanning where relevant
- threat modeling for new services

### 5. Public architectural explanation is still catching up

This new section improves that situation, but architecture notes still need to keep pace with implementation.

## Linting And Security Workflow

For day-to-day engineering, a practical baseline is:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @alternun/api run build
pnpm --filter alternun-docs run build
```

If a change touches infrastructure or identity, contributors should also inspect the relevant `packages/infra` scripts and settings before assuming a deploy is safe.

## Public Security Posture Statement

Alternun is building in public, but it should not confuse transparency with loose controls.

The target posture is:

- public architecture visibility
- private secret handling
- explicit trust boundaries
- reproducible deployments
- conservative operational defaults

That is the standard contributors should aim to maintain.
