# Alternun Auth Facade Refactor Plan

## Goal

Refactor `packages/auth` into a real provider-agnostic facade with explicit boundaries for execution, issuer trust, persistence, email, and runtime adapters.

The live refactor workspace lives in `packages/auth/docs/auth-facade-refactor/`.

## Progress

- Milestone 1 complete: the Authentik preset now accepts an explicit provisioning adapter, and the mobile app passes the legacy Supabase-backed adapter at the app edge.
- Milestone 2 complete: the remaining direct Supabase callback session finalization now lives behind a package helper used by the mobile auth callback route.
- Milestone 3 complete: OIDC session-to-user normalization now lives in the package helper surface, so the mobile callback bridge reuses the shared auth mapping instead of carrying its own copy.
- Milestone 4 complete: the browser callback payload parser and URL token stripper now live in the auth package, reducing direct callback logic in the app route.
- Milestone 5 complete: social sign-in dispatch now lives behind a shared package helper, so the mobile screen no longer branches independently for relay, redirect, and native paths.
- Milestone 6 complete: pending-provider resume handling now lives behind a shared helper, and native session-restoration coverage exists in the facade test surface.
- Milestone 7 complete: the backend exchange now supports a fail-closed issuer-owned mode, so the canonical session rollout can be enforced instead of silently falling back to compatibility behavior.
- Milestone 8 complete: local Better Auth execution now has a dedicated dev runner in `apps/api`, and the API-origin `/auth` route proxies to that private service for local browser validation.
- Milestone 9 complete: Better Auth web execution now prefers the browser client when available, with corrected social/email fallback routes for the canonical API-origin `/auth` path.

## Target Architecture

### Facade Boundary

Keep the public API narrow and stable.

The facade should own:

- `signIn`
- `signUp`
- `signOut`
- session restoration
- auth state subscription
- normalized identity/session mapping

The facade should not expose raw provider clients to app code.

### Internal Module Layout

Refactor the package into these areas:

```text
src/
  core/
    types.ts
    contracts.ts
    errors.ts
    session.ts
    config.ts
  facade/
    AlternunAuthFacade.ts
    createAuthFacade.ts
  providers/
    better-auth/
    authentik/
    supabase-legacy/
    email/
  identity/
    principal.ts
    claims.ts
    mapping.ts
  runtime/
    web/
    native/
    shared/
  compat/
  validation/
```

### Provider Roles

- Better Auth: login execution only
- Authentik: canonical issuer and trust boundary
- NestJS backend: identity exchange, principal sync, and app-session issuance
- Supabase: repository and email compatibility only

### Normalized Domain Model

The facade should move all app-facing code onto normalized models:

- `ExternalIdentity`
- `Principal`
- `AlternunSession`
- `LinkedAuthAccount`

No UI/runtime layer should depend on raw Supabase or raw Better Auth user objects.

## Flow Design

The intended sign-in sequence is:

1. App calls `signIn({ provider: "google" })`.
2. Facade chooses the execution provider.
3. Execution provider completes login and returns a normalized external identity.
4. Facade sends that identity to the backend exchange endpoint.
5. Backend upserts principal and linked account state.
6. Backend returns canonical session material.
7. Facade stores the normalized session.
8. App consumes the session without provider-specific branching.

## Migration Strategy

Use staged rollout flags so the refactor can be adopted incrementally:

- `AUTH_EXECUTION_PROVIDER=better-auth|supabase`
- `AUTH_ISSUER_PROVIDER=authentik|supabase-legacy`
- `AUTH_EMAIL_PROVIDER=supabase|postmark|ses`

The default rollout should preserve compatibility while new paths are introduced.

## Implementation Sequence

1. Audit the current package and compare it against the working reference behavior.
2. Implement the core contracts and normalized models.
3. Introduce the facade and compatibility exports.
4. Add Better Auth execution support.
5. Add Authentik issuer support.
6. Add repository and email adapters.
7. Rewire web/native runtime behavior through the facade.
8. Isolate legacy Supabase coupling behind compatibility layers.
9. Add tests for the facade, providers, and state restoration.
10. Document the migration and backend contract.

## Validation Plan

Validate in this order:

- unit tests for core contracts and normalized mapping
- provider contract tests
- facade integration tests
- compatibility tests for the existing API surface
- web session restoration checks
- native session restoration checks
- backend exchange happy-path tests

## Operational Notes

- Keep the current consumer-facing API stable unless a shim is impossible.
- Preserve the current login flow until the new flow is validated end to end.
- Do not let session persistence silently fall back to Supabase when Better Auth is selected.
- Do not let Authentik and Better Auth both behave like primary token issuers.
