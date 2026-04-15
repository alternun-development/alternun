# `@alternun/auth`

Shared auth wrapper for Alternun.

This package sits on top of `@edcalderon/auth`, but it carries Alternun-specific browser callback behavior, Authentik defaults, provisioning hooks, runtime wiring, and the facade that hides the current execution-provider split from apps.

The package is currently in a staged migration from a Supabase-first wrapper to a provider-agnostic facade:

- Better Auth is the target social-login execution layer and now has a real local dev service behind the API-origin `/auth` route.
- Authentik remains the canonical issuer.
- Supabase remains the compatibility path for email/password and other legacy execution flows during rollout.
- `AUTH_EXCHANGE_URL` lets the issuer provider hand off execution identities to the backend exchange endpoint. If the backend runtime has `AUTHENTIK_JWT_SIGNING_KEY`, it can mint issuer-owned JWTs; otherwise the package keeps a compatibility fallback.

## Contract

The package is runtime-explicit.

- Web:
  - `webRedirectSignIn(...)`
  - callback route: `/auth/callback`
- Native:
  - `nativeSignIn(...)`

Do not treat Expo web as native auth.

## Responsibilities

### This package owns

- runtime-specific sign-in helpers
- Authentik issuer/client/redirect resolution
- Authentik direct source/flow entry URL helpers
- browser callback URL derivation
- return-target storage for browser redirects
- the Alternun mobile auth client wrapper

### This package does not own

- app route rendering
- browser callback page UI
- Authentik server bootstrap
- Supabase schema / RLS policy decisions

## Important Files

- `src/mobile/runtimeSignIn.ts`
- `src/mobile/authentikUrls.ts`
- `src/mobile/authentikClient.ts`
- `src/mobile/AlternunMobileAuthClient.ts`
- `src/mobile/AppAuthProvider.tsx`

## Notes

- Popup auth is not part of the supported contract.
- Custom Authentik provider flow slugs are optional and explicit-only. They are ignored unless `EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS=true`.
- When `AUTH_EXECUTION_PROVIDER` or `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER` is `better-auth`, Google and Discord social login should go through the Better Auth execution path before the issuer exchange.
- The canonical browser-facing Better Auth URL is the API-origin `/auth` route. In local development, that route proxies to the private service on `http://localhost:9083`.
- Email/password should stay on the legacy Supabase-compatible execution path when that fallback client is available, so Better Auth and email auth remain independent flows.
- Web callback URLs default to `https://<origin>/auth/callback` when a browser origin is available.
- AIRS web can force a fresh Authentik session before social source login when shared SSO sessions would otherwise keep the wrong Authentik user active during callback handoff.
- Static apps such as admin/docs can wrap their own OIDC authorize URLs with `buildAuthentikLoginEntryUrl(...)` to start Google-style login from an app-owned relay route instead of dropping users into the Authentik library.

## Migration Docs

- `docs/auth-facade-refactor/README.md`

The full auth refactor workspace lives in `docs/auth-facade-refactor/`:

- `SPEC.md`
- `PLAN.md`
- `TASKS.md`
- `AUDIT.md`
- `ARCHITECTURE.md`
- `MIGRATION_BETTER_AUTH.md`
- `CONFIG.md`
- `BACKEND_HANDOFF.md`
- `CONFIG_CONTRACT.md`
- `DEPRECATION_MAP.md`
- `UPSTREAM_BETTER_AUTH_REQUEST.md`
