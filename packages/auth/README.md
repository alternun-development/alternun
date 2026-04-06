# `@alternun/auth`

Shared auth wrapper for Alternun.

This package sits on top of `@edcalderon/auth`, but it carries Alternun-specific browser callback behavior, Authentik defaults, provisioning hooks, and runtime wiring.

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
- Web callback URLs default to `https://<origin>/auth/callback` when a browser origin is available.
- AIRS web can force a fresh Authentik session before social source login when shared SSO sessions would otherwise keep the wrong Authentik user active during callback handoff.
