# Alternun Auth Audit

## Scope

This audit covers the current `packages/auth` implementation in Alternun and compares it with the working browser-auth pattern from CIG.

The important question is not whether the package has facade-shaped code. It does.
The question is whether the live runtime still lets Supabase shadow the canonical auth session or forces the browser flow to depend on app-level legacy shims.

## What Exists Now In Alternun

The package is already split into the intended layers:

- `src/core/*` holds normalized auth types, session shaping, and provider contracts.
- `src/facade/AlternunAuthFacade.ts` coordinates execution, issuer exchange, repository writes, and auth-state subscriptions.
- `src/providers/better-auth/*` models Better Auth as the execution layer.
- `src/providers/authentik/*` models Authentik as the canonical issuer boundary.
- `src/providers/supabase-legacy/*` holds compatibility providers for the old runtime.
- `src/mobile/*` still carries browser and native Authentik helpers for the current app flow.

That means the package-level architecture is ahead of the application wiring.

## What Is Still Supabase-Coupled

These pieces still depend on Supabase behavior:

- `src/mobile/AlternunMobileAuthClient.ts`
- `src/providers/supabase-legacy/SupabaseExecutionProvider.ts`
- `src/providers/supabase-legacy/SupabaseIdentityRepository.ts`
- `src/providers/email/SupabaseEmailProvider.ts`
- `src/compat/upsertOidcUser.ts`
- `src/mobile/authentikPreset.ts`
- `apps/mobile/components/auth/authWebSession.ts`
- `apps/mobile/app/auth/callback.tsx`
- `apps/mobile/components/auth/AppAuthProvider.tsx`

The most important coupling is not just the presence of Supabase code. It is the fact that app-facing web callback handling still performs Supabase session finalization and provisioning directly in the UI/runtime layer.

## What Is Authentik-Specific

These pieces are Authentik-specific by design:

- `src/mobile/authentikClient.ts`
- `src/mobile/authentikUrls.ts`
- `src/mobile/authEntry.ts`
- `src/providers/authentik/AuthentikIssuerProvider.ts`
- `src/mobile/authentikPreset.ts`

This is the right place for issuer and callback logic. The problem is not Authentik itself. The problem is mixing Authentik handling with legacy Supabase session assumptions.

## What Is Already Reusable

These pieces are the strongest part of the current package and should stay:

- `src/core/contracts.ts`
- `src/core/types.ts`
- `src/core/session.ts`
- `src/identity/*`
- `src/runtime/config.ts`
- `src/validation/*`
- `src/facade/AlternunAuthFacade.ts`

The facade is the correct place to normalize runtime behavior across web, native, and migration modes.

## Why CIG Worked Better

CIG had one thing Alternun still lacks in practice: an explicit browser bridge.

In CIG:

- the landing app starts login
- the dashboard origin owns the PKCE relay and callback exchange
- the API owns provisioning and domain auth
- Authentik is only the IdP
- Supabase is a downstream persistence target, not the thing deciding browser auth shape

That separation is visible in the CIG auth docs and route handlers, especially the relay route and login-callback bridge.

Alternun does have Authentik helpers and a facade, but the app layer still finalizes browser callback state through legacy OIDC/Supabase assumptions. That is the main difference in shape.

## Exact Mistakes Causing The Brittle Flow

1. Better Auth was not being allowed to remain the primary execution session when legacy Supabase state was also present.
2. Email execution still had compatibility shortcuts that could route through legacy Supabase behavior before the Better Auth client path was used.
3. The app callback layer still manages OIDC session restoration and provisioning directly instead of letting the facade own the canonical session path.
4. The package still exports enough legacy helpers that it is easy for app code to keep depending on them instead of the facade.
5. Authentik browser/session cleanup was being performed in more than one place, which made the flow hard to reason about during redirects and stale-session recovery.

## Current Fix Applied

The provider precedence bug was corrected so Better Auth is now primary and legacy Supabase session state is only returned when explicit compatibility fallback is enabled.

That does not finish the migration, but it removes the most damaging hidden-source-of-truth behavior.

## Bottom Line

`packages/auth` is now structurally close to the intended facade architecture.

The remaining work is mostly:

- moving app-level browser callback handling fully behind the facade
- removing more legacy Supabase assumptions from the mobile web session bridge
- keeping the issuer exchange path canonical and explicit
