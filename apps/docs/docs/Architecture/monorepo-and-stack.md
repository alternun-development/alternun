---
sidebar_position: 2
---

# Monorepo and Stack

Alternun uses a pnpm workspace monorepo with TurboRepo orchestration.

That choice is intentional: the repo contains multiple apps that share infrastructure, auth patterns, translations, design primitives, and release automation.

## Workspace Layout

```mermaid
flowchart TD
  Root[alternun monorepo]
  Root --> Apps[apps/*]
  Root --> Packages[packages/*]
  Root --> InternalDocs[docs/*]

  Apps --> Mobile[apps/mobile]
  Apps --> Admin[apps/admin]
  Apps --> API[apps/api]
  Apps --> DocsSite[apps/docs]
  Apps --> Web[apps/web]

  Packages --> Auth[@alternun/auth]
  Packages --> UI[@alternun/ui]
  Packages --> I18n[@alternun/i18n]
  Packages --> Infra[@alternun/infra]
  Packages --> Email[packages/email-templates]
```

## App Surfaces

### `apps/mobile`

Primary AIRS application codebase.

Key technologies:

- Expo
- Expo Router
- React 19
- React Native 0.81
- React Native Web
- Supabase JavaScript client
- WalletConnect
- Firebase
- NativeWind and Tailwind-oriented styling support

Why it matters:

- one codebase supports mobile-native patterns and web delivery
- the public AIRS domain family is driven from this app through the infrastructure layer

### `apps/admin`

Internal admin console.

Key technologies:

- Vite
- React 18
- React Router
- Refine
- `oidc-client-ts`

Why it matters:

- it separates operational workflows from the public AIRS experience
- it can be deployed together with the API in dashboard stacks

### `apps/api`

Custom backend service.

Key technologies:

- NestJS 10
- Fastify 4
- Swagger / OpenAPI
- AWS Lambda adapter

Why it matters:

- gives the platform a place for custom backend logic that does not belong in the client
- currently includes health endpoints and integration-oriented flows such as Decap OAuth bridge behavior

### `apps/docs`

Public documentation site.

Key technologies:

- Docusaurus 3
- React
- Mermaid diagrams
- Decap CMS integration
- `oidc-client-ts` for protected editor access

Why it matters:

- provides public product and developer documentation
- supports a guarded editing workflow rather than editing content directly in production

### `apps/web`

Next.js application.

Current role:

- secondary web surface
- not the primary public deployment target in the current infra model

This is important for newcomers because the repo is **Expo-web-first** for the main AIRS deployment path, not Next.js-first.

## Shared Packages

### `@alternun/auth`

Shared auth wrapper package.

Purpose:

- centralizes app-side auth abstractions
- wraps the upstream auth library used by the project
- adds mobile-oriented auth client behavior
- includes SES and email support scripts around identity/email setup

### `@alternun/ui`

Shared UI component package.

Purpose:

- keeps reusable interface pieces out of a single app
- supports multi-app reuse where design language overlaps
- is consumed source-first inside the monorepo; `packages/ui/dist` is a local build artifact

### `@alternun/i18n`

Shared translation catalog package.

Purpose:

- central place for locale data and runtime helpers
- reused by apps instead of duplicating translation files everywhere

### `packages/email-templates`

Email generation and synchronization support.

Purpose:

- stores shared localized email content
- supports downstream delivery systems such as Supabase email/template sync

### `@alternun/infra`

The deployment and platform package.

Purpose:

- defines AWS resources
- controls domain and stage mapping
- owns pipeline creation and deployment safety checks
- acts as the operational backbone of the monorepo

## Core Tooling

The repo is coordinated with a small set of high-leverage tools:

- **pnpm** for workspace package management
- **TurboRepo** for build graph orchestration
- **TypeScript** across the monorepo
- **ESLint** and **Prettier** for code hygiene
- **Husky** and **lint-staged** for pre-commit enforcement

## Build and Task Model

At the repo root, common commands are standardized:

- `pnpm build`
- `pnpm dev`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

Turbo coordinates these tasks so package dependencies build in the right order.

That gives the team a practical middle ground:

- apps can evolve independently
- shared packages stay reusable
- cross-cutting changes can still be verified from one root command set

## Why This Structure Works

This monorepo is optimized for platform work rather than a single standalone app.

That means the structure is less about "frontend versus backend" and more about:

- public experience
- internal operations
- identity and trust boundaries
- deployable infrastructure
- shared product building blocks

For public contributors, that is the most important mental model to keep in mind while exploring the codebase.
