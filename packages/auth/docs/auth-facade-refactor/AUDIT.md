# Alternun Auth Audit

## Scope

This audit covers the current `packages/auth` implementation in Alternun and compares it with the browser-auth pattern documented in CIG.

The important question is not whether the package has the right folders. It does.
The question is whether the app still owns parts of browser auth that should be hidden behind the facade.

## What Exists Now In Alternun

Alternun auth is already partway through the target refactor:

- `src/core/*` holds normalized auth types, session shaping, and provider contracts.
- `src/facade/AlternunAuthFacade.ts` coordinates execution, issuer exchange, repository writes, and auth-state subscriptions.
- `src/providers/better-auth/*` models Better Auth as the execution layer.
- `src/providers/authentik/*` models Authentik as the canonical issuer boundary.
- `src/providers/supabase-legacy/*` holds compatibility providers for the old runtime.
- `src/runtime/config.ts` resolves `AUTH_EXECUTION_PROVIDER`, `AUTH_ISSUER_PROVIDER`, `AUTH_EMAIL_PROVIDER`, and backend handoff URLs from env.

That means the package architecture is now ahead of the remaining app wiring.

## What Is Still Supabase-Coupled

These pieces still depend on Supabase behavior or Supabase-shaped fallbacks:

- `src/mobile/AlternunMobileAuthClient.ts`
- `src/providers/supabase-legacy/SupabaseExecutionProvider.ts`
- `src/providers/supabase-legacy/SupabaseIdentityRepository.ts`
- `src/providers/email/SupabaseEmailProvider.ts`
- `src/compat/upsertOidcUser.ts`
- `src/mobile/authentikPreset.ts`
- `apps/mobile/components/auth/authWebSession.ts`
- `apps/mobile/app/auth/callback.tsx`
- `apps/mobile/components/auth/AppAuthProvider.tsx`

The main residual problem is not just that Supabase code exists. It is that the app-facing callback bridge still finalizes OIDC state and provisioning directly in the UI/runtime path instead of letting the facade own the canonical session handoff.

## What Is Authentik-Specific

These pieces are Authentik-specific by design:

- `src/mobile/authentikClient.ts`
- `src/mobile/authentikUrls.ts`
- `src/mobile/authEntry.ts`
- `src/providers/authentik/AuthentikIssuerProvider.ts`
- `src/mobile/authentikPreset.ts`

This is the correct place for issuer and callback logic. The issue is not Authentik itself. The issue is mixing Authentik handling with legacy Supabase session assumptions and a UI-owned provisioning bridge.

## What Is Already Reusable

These pieces are the best part of the current package and should stay:

- `src/core/contracts.ts`
- `src/core/types.ts`
- `src/core/session.ts`
- `src/identity/*`
- `src/runtime/config.ts`
- `src/validation/*`
- `src/facade/AlternunAuthFacade.ts`

The facade is the right place to normalize runtime behavior across web, native, and migration modes.

## Why CIG Worked Better

CIG had one thing Alternun still lacks in practice: a stricter browser boundary.

In CIG:

- the landing app starts login
- the dashboard origin owns the PKCE relay and callback exchange
- the API owns provisioning and domain auth
- Authentik is only the IdP
- Supabase is downstream persistence, not the thing deciding browser auth shape

The important part is the separation of concerns, not the stack.

## Exact Mistakes Causing The Brittle Flow

1. The browser callback bridge still carries provisioning logic in `apps/mobile/app/auth/callback.tsx` and `src/mobile/authentikPreset.ts`.
2. Legacy Supabase finalization still sits in the mobile auth client path, which makes the session model easy to drift back toward Supabase-shaped state.
3. The package still exports enough compatibility helpers that it is easy for app code to keep depending on them instead of the facade.
4. Authentik handling is split across package helpers and app callback helpers, which makes redirect behavior harder to reason about during stale-session recovery.
5. The runtime has a valid compatibility path, but it is still close enough to the app boundary that it can become the hidden default if the consumer code is not careful.

## Current Fix Applied

The provider-selection path now makes Better Auth the explicit execution choice when `AUTH_EXECUTION_PROVIDER=better-auth`, and the legacy Supabase path is only used when the runtime asks for it.

That removes one hidden-source-of-truth layer, but it does not finish the migration.

## Bottom Line

`packages/auth` is already structurally close to the intended facade architecture.

The remaining work is mostly:

- moving app-level browser callback handling fully behind the facade
- removing more legacy Supabase assumptions from the mobile web session bridge
- keeping issuer exchange canonical and explicit
- shrinking the compatibility surface so app code naturally picks the facade first
