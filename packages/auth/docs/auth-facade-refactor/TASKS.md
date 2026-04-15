# Alternun Auth Facade Refactor Tasks

## Workspace Setup

- [x] Move the auth refactor docs into `docs/auth-facade-refactor/`
- [x] Refresh the auth audit from the current Alternun and CIG code

## Phase 0: Audit And Diff

- [x] Read the current `packages/auth` implementation and map the existing runtime responsibilities.
- [x] Read the reference auth flow docs from CIG and capture the boundary that made it work.
- [x] Write `AUDIT.md` with a repo-aware diff of current Alternun auth versus the reference pattern.
- [x] Identify the exact Supabase-coupled code paths, Authentik-specific code paths, and reusable pieces.

## Phase 1: Core Contracts

- [x] Add `AuthExecutionProvider` to define sign-in, sign-up, sign-out, session, refresh, link, and unlink behavior.
- [x] Add `IssuerProvider` to define exchange, issuer session, refresh, logout, claims validation, and config discovery.
- [x] Add `IdentityRepository` to isolate principal, user projection, linked account, and provisioning writes.
- [x] Add `EmailProvider` to isolate verification, reset, magic-link, and healthcheck behavior.
- [x] Add normalized domain models for `ExternalIdentity`, `Principal`, `AlternunSession`, and `LinkedAuthAccount`.

## Phase 2: Facade And Compatibility

- [x] Implement `AlternunAuthFacade`.
- [x] Implement `createAuthFacade`.
- [x] Preserve the current consumer-facing API surface through compat exports and adapters.
- [x] Keep validation central and explicit so runtime callers do not bypass the facade.

## Phase 3: Better Auth Execution

- [x] Implement `providers/better-auth/BetterAuthExecutionProvider.ts`.
- [x] Support Google, GitHub, Apple placeholder, and email/password execution paths.
- [x] Normalize the result into `ExternalIdentity`.
- [x] Use the Better Auth browser client for web social login and keep the HTTP endpoint fallback aligned with the Better Auth social/email routes.
- [x] Keep Better Auth execution-only so it does not become the final app token authority.

## Phase 4: Authentik Issuer

- [x] Implement `providers/authentik/AuthentikIssuerProvider.ts`.
- [x] Define the backend exchange path for normalized identity input.
- [x] Return canonical session material based on the issuer layer, not raw execution tokens.
- [x] Preserve callback and relay compatibility where needed, but keep the issuer boundary explicit.

## Phase 5: Legacy Supabase Isolation

- [x] Make `createAlternunAuthentikPreset(...)` accept an explicit provisioning adapter and pass the legacy compatibility adapter from the mobile app edge.
- [x] Move Supabase session behavior behind `SupabaseExecutionProvider` and `SupabaseLegacyIssuerProvider`.
- [x] Move repository writes behind `SupabaseIdentityRepository`.
- [x] Move email behavior behind `SupabaseEmailProvider`.
- [x] Keep all legacy paths behind feature flags and explicit compatibility notes.

## Phase 6: Runtime Adapters

- [x] Centralize web and native social-sign-in dispatch behind `startSocialSignIn(...)` so the mobile screen no longer branches across relay, redirect, and native paths.
- [x] Rewire web auth behavior through the facade.
- [x] Rewire native auth behavior through the facade.
- [x] Keep web and native differences inside runtime adapters, not in app code.
- [x] Move direct callback session finalization behind a package helper so app code no longer calls `supabase.auth.setSession(...)` directly.
- [x] Move OIDC session-to-user normalization into the package helper and re-export it for app callback bridges.
- [x] Move browser auth callback payload parsing and URL token stripping into the package helper surface.
- [x] Keep browser callback handling stable and refresh-safe.

## Phase 7: Backend Exchange And Sync

- [x] Define the `/auth/exchange` request and response contract.
- [x] Add backend principal sync and linked-account upsert handling.
- [x] Return canonical app session data from the backend exchange path.
- [x] Document the expected issuer claims and runtime context payload.

## Phase 8: Email Abstraction

- [x] Add provider selection for `AUTH_EMAIL_PROVIDER`.
- [x] Keep Supabase email as the temporary compatibility path.
- [x] Add non-Supabase provider support for verification and reset flows.

## Phase 9: Tests

- [x] Add provider contract tests for each execution and issuer implementation.
- [x] Add facade integration tests.
- [x] Add compatibility tests for existing public API behavior.
- [x] Add web session restoration tests.
- [x] Add native session restoration tests.
- [x] Add exchange-flow happy-path coverage.

## Phase 11: Local Better Auth Dev Service

- [x] Add a local Better Auth dev runner under `apps/api`.
- [x] Wire `pnpm dev:all` to launch the Better Auth dev runner alongside the Nest API.
- [x] Document the dedicated local Better Auth env file for dev execution testing.

## Phase 10: Docs And Rollout

- [x] Write `ARCHITECTURE.md` to explain the final boundary model.
- [x] Write `MIGRATION_BETTER_AUTH.md` for app migration guidance.
- [x] Write `CONFIG.md` for env vars and rollout flags.
- [x] Write `BACKEND_HANDOFF.md` for the backend contract and claims shape.
- [x] Keep rollout notes explicit about what still depends on Supabase and what is now provider-agnostic.

## Phase 11: Backend Exchange Hardening

- [x] Add a fail-closed issuer-owned rollout flag for `POST /auth/exchange`.
- [x] Make the backend exchange reject compatibility fallback when canonical issuer minting is required but unavailable.
- [x] Document the strict rollout mode in the operator and migration docs.
