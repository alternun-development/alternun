# Alternun Auth Architecture

## Overview

`packages/auth` is moving from a Supabase-first wrapper into a provider-agnostic facade that still preserves the `@edcalderon/auth` consumer surface.

The current architecture is:

- `@edcalderon/auth` remains the consumer-facing `AuthClient` / `AuthProvider` contract.
- `AlternunAuthFacade` is the coordinator used by apps.
- `AuthExecutionProvider` executes login/signup/session UX.
- `IdentityIssuerProvider` owns canonical identity and app tokens.
- `IdentityRepository` isolates persistence assumptions.
- `EmailProvider` isolates auth-related email delivery.

## Current Rollout State

The architecture layer is implemented, but the runtime migration is still partial.

- `AlternunAuthFacade` is real and now sits behind `AppAuthProvider`.
- Better Auth execution is modeled through `BetterAuthExecutionProvider`, but not yet fully wired to a live Better Auth service by default.
- Authentik still remains the configured issuer boundary.
- `apps/api/src/modules/auth-exchange/*` now exposes `POST /auth/exchange`, which can mint issuer-owned tokens when the backend signing key is available.
- The `dashboard-dev` backend stack already receives that signing key from the identity stack output, so the live testnet exchange path is issuer-owned instead of compatibility-only.
- `POST /auth/exchange` can now be configured to fail closed via `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true`, so the rollout can stop accepting compatibility fallback when canonical minting must be present.
- `AuthentikIssuerProvider` now prefers `AUTH_EXCHANGE_URL` when configured and only falls back to local issuer synthesis when the backend path or signing key is unavailable.
- `BetterAuthExecutionProvider` now keeps the Better Auth session ahead of legacy Supabase compatibility state unless explicit fallback is enabled.
- Supabase compatibility paths still exist for execution, persistence, and email while rollout is incomplete.
- The real backend exchange contract is still incomplete, so issuer session creation is only partially backend-owned.

## Current Flow

1. App code calls `AuthProvider` from `@edcalderon/auth`.
2. Alternun injects `AlternunAuthFacade` as the client.
3. The facade delegates to the configured execution provider.
4. If an external identity is available, the facade asks the issuer provider to exchange it for the canonical session.
5. If `AUTH_EXCHANGE_URL` is configured, the issuer provider prefers the backend exchange endpoint before any local compatibility synthesis, and the backend should mint issuer-owned JWTs when `AUTHENTIK_JWT_SIGNING_KEY` is available. When `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true`, the backend must fail closed instead of returning compatibility fallback.
6. The repository layer persists principal and linkage records when the issuer path requires it.

## Provider Roles

### Execution

- `BetterAuthExecutionProvider` is the new execution layer for Google, GitHub, and Apple placeholder social login.
- `SupabaseExecutionProvider` remains the compatibility path for legacy email/password flows and other fallback execution paths.

### Issuer

- `AuthentikIssuerProvider` is the canonical issuer boundary.
- `SupabaseLegacyIssuerProvider` exists only as a bridge while the rollout is incomplete.
- `POST /auth/exchange` is the current API-side handoff point for reconciliation.

### Repository

- `SupabaseIdentityRepository` preserves the current database/RPC behavior.
- Future repositories can target Drizzle or plain Postgres without changing app code.

### Email

- `SupabaseEmailProvider` is the temporary compatibility layer.
- `PostmarkEmailProvider` and `SesEmailProvider` are target-ready abstractions.

## Compatibility Layer

`AlternunMobileAuthClient` is still exported for backward compatibility, but new app setup should use the facade path.

Better Auth and email/password are intentionally split: social login routes through Better Auth, while email/password stays on the legacy compatibility path when the fallback client is present.

The current compatibility surface still includes:

- `signInWithGoogle`
- `signUpWithEmail`
- `signIn`
- `signOut`
- `getUser`
- auth-state subscriptions
- `setOidcUser`
- legacy Supabase session bridging for the current callback flow

## Temporary Supabase Dependencies

Supabase is still present in:

- legacy execution fallback when the backend exchange or signing key is unavailable
- `upsert_oidc_user` compatibility provisioning
- wallet registry compatibility writes
- legacy email/template flows

Those paths are intentionally isolated behind the new provider contracts so they can be removed without rewriting apps.

## Notes

- The canonical app token authority remains Authentik.
- Better Auth is an execution layer only.
- The facade should not become the durable identity store.
