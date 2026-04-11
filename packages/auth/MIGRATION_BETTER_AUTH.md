# Better Auth Migration

## Goal

Move Alternun auth execution to Better Auth while keeping Authentik as the canonical issuer and preserving the current `@alternun/auth` app-facing API.

The migration target is:

- Better Auth executes social login flows.
- Email/password stays on the legacy Supabase-compatible execution path until that flow is migrated independently.
- Authentik remains the issuer trust boundary.
- NestJS owns identity exchange, provisioning, and audit.
- Alternun apps continue to call `useAuth()`, `AuthProvider`, `signIn`, `signUpWithEmail`, `signOut`, and `getUser`.

## Actual State

Status as of `2026-04-09`.

### Implemented

- Provider contracts exist under `src/core/` and `src/providers/`.
- `AlternunAuthFacade` is implemented and exported.
- `AppAuthProvider` now creates the facade instead of instantiating the legacy mobile client directly.
- `BetterAuthExecutionProvider` exists as an execution adapter for social login and can delegate email/password to the legacy compatibility client when configured.
- `AuthentikIssuerProvider` exists as an issuer adapter and now prefers `AUTH_EXCHANGE_URL` when present.
- `apps/api/src/modules/auth-exchange/*` now exposes `POST /auth/exchange` as a reconciliation endpoint that can mint issuer-owned JWTs when `AUTHENTIK_JWT_SIGNING_KEY` is available.
- The `dashboard-dev` backend stack now receives `AUTHENTIK_JWT_SIGNING_KEY` from the identity stack output, so the live `/auth/exchange` path returns `exchangeMode: "issuer-owned"` without depending on manual secret copying.
- `SupabaseExecutionProvider`, `SupabaseIdentityRepository`, and `SupabaseEmailProvider` isolate legacy behavior behind compatibility adapters.
- Runtime config now supports feature flags for execution, issuer, and email provider selection.
- Package tests cover facade behavior, contract compatibility, and provider adapters.

### Still Legacy

- Default execution provider is still `supabase`.
- Better Auth is not yet wired to a real upstream Better Auth runtime or server deployment.
- `POST /auth/exchange` exists in `apps/api`, and it can mint issuer-owned JWTs when the backend signing key is configured, but the reconciliation path still uses compatibility persistence until the backend owns the full principal lifecycle.
- `AuthentikIssuerProvider.exchangeIdentity(...)` now prefers the backend exchange URL when configured, and it falls back to local compatibility session synthesis only when the backend path or signing key is unavailable.
- On testnet, the backend exchange path is now the normal route for `dashboard-dev`; the fallback remains only for missing-key or compatibility-only environments.
- `SupabaseIdentityRepository` still relies on `upsert_oidc_user` for the only real persistence path.
- Linked account persistence and provisioning events are still placeholders.
- `createAlternunAuthentikPreset(...)` still provisions through the compatibility `upsertOidcUser` shim.
- Email infrastructure is abstracted in code, but current operational scripts remain Supabase-oriented compatibility scripts.

### What This Means

The package architecture is migrated.

The production runtime behavior is not fully migrated.

## What Apps Keep Using

Apps should continue to call:

- `useAuth()`
- `AuthProvider`
- `signIn`
- `signInWithGoogle`
- `signUpWithEmail`
- `signOut`
- `getUser`

Those calls now route through `AlternunAuthFacade`, even while legacy providers remain enabled.

## Current Defaults

The current defaults preserve legacy behavior:

- `AUTH_EXECUTION_PROVIDER=supabase`
- `AUTH_ISSUER_PROVIDER=authentik`
- `AUTH_EMAIL_PROVIDER=supabase`

Do not switch `AUTH_EXECUTION_PROVIDER` to `better-auth` in shared environments until the testnet gates in `docs/alternun-better-auth-testnet-execution-plan.md` are met.

## Definition Of Done

The migration is complete only when all of the following are true:

1. Better Auth is the main execution layer for Google, GitHub, and Apple on testnet.
2. Final application sessions always come from the canonical issuer path, not raw Better Auth execution tokens.
3. `POST /auth/exchange` exists and is used by the facade or issuer adapter.
4. `POST /auth/exchange` returns issuer-owned session data when the backend signing key is configured, without exposing raw execution-layer tokens as the final app session.
5. Identity persistence no longer depends on UI/runtime calls to `upsert_oidc_user`.
6. Wallet linkage and linked account records are persisted through app-owned repository abstractions.
7. Email verification and password reset flows run through the provider abstraction, with email/password execution still supported through the legacy compatibility path during the migration.
8. Testnet validation passes for web and mobile callback behavior.

## Remaining Workstreams

### Workstream 1: Better Auth Runtime Integration

- Add a real Better Auth runtime integration instead of only the generic adapter shell.
- Decide whether Better Auth runs inside `apps/api` or as a dedicated auth service.
- Wire Google, GitHub, and social login first.
- Keep Apple as a testnet-ready placeholder unless credentials and native flow details are ready.

### Workstream 2: Backend Exchange

- `POST /auth/exchange` exists as a compatibility endpoint.
- Replace the remaining compatibility fallback with real backend issuer-token minting for all testnet and production paths.
- Exchange Better Auth execution identity for the canonical Alternun principal and Authentik-aligned issuer session.
- Return issuer claims and refresh semantics from the backend instead of synthesizing them in the package.

### Workstream 3: Persistence Migration

- Replace direct UI/runtime provisioning assumptions around `upsert_oidc_user`.
- Add app-owned principal, user projection, linked account, wallet account, and provisioning event persistence.
- Keep the Supabase compatibility repository only as a temporary bridge.

### Workstream 4: Email Migration

- Keep `SupabaseEmailProvider` as the current fallback.
- Stand up the target provider path for `postmark` or `ses`.
- Route verification, password reset, and magic link behavior through the provider abstraction.

### Workstream 5: Testnet Rollout

- Provision Better Auth self-hosted resources.
- Wire testnet secrets and OAuth credentials.
- Enable Better Auth only in testnet first.
- Verify callback, issuer exchange, and persistence behavior on real domains.

## Rollout Stages

1. Land the backend exchange contract and Better Auth service deployment.
2. Provision testnet Better Auth resources and provider credentials.
3. Enable `AUTH_EXECUTION_PROVIDER=better-auth` on testnet only.
4. Verify final session authority remains Authentik-driven.
5. Move linked account and wallet persistence behind repository calls.
6. Move email delivery off Supabase-only assumptions.
7. Remove Supabase execution only after the exchange flow is stable in testnet.
8. Migrate email/password execution off the legacy compatibility path only when the replacement flow is ready.

## App Migration Notes

1. Keep using `packages/auth` exports.
2. Stop depending on `supabase.auth.updateUser({ data })` for authorization state.
3. Treat `setOidcUser` and the current callback helpers as compatibility APIs.
4. Move app-specific persistence assumptions to the repository layer.
5. Keep feature flags in place until testnet validation is complete.

## Testnet Gate

Before calling the migration production-ready on testnet, the following must pass:

- Google sign-in completes through Better Auth and resolves to the canonical issuer session.
- GitHub sign-in completes through Better Auth and resolves to the canonical issuer session.
- Email sign-up sends verification email through the selected email provider path.
- Password reset flow works end to end without Supabase-only runtime assumptions.
- Web callback routing returns to the right app surface.
- Native callback routing resolves to the right issuer session.
- Principal mapping is stable across repeated sign-ins.
- Fallback to the legacy path can still be re-enabled with env flags.

## Related Docs

- `packages/auth/ARCHITECTURE.md`
- `packages/auth/CONFIG_CONTRACT.md`
- `packages/auth/BACKEND_HANDOFF.md`
- `packages/auth/DEPRECATION_MAP.md`
- `docs/alternun-better-auth-testnet-execution-plan.md`
