# Alternun Auth Facade Refactor Spec

## Status

Draft

## Problem Statement

Alternun auth is not yet a single coherent product surface.

Today, `packages/auth` already exists as the main auth abstraction, but the runtime still mixes:

- browser flow orchestration
- issuer/trust behavior
- persistence assumptions
- email delivery assumptions
- legacy Supabase session handling

That overlap is what makes web login brittle, makes the app feel session-driven by hidden implementation details, and keeps migration risk high.

## What We Are Building

A single auth facade for Alternun that app code can call without knowing which provider is executing underneath it.

The facade should:

- expose one stable app-facing auth API
- execute login through the chosen execution provider
- treat Authentik as the canonical issuer and trust boundary
- exchange normalized identities through the backend
- store normalized app sessions and principal records
- keep Supabase as data-platform-only during migration
- preserve compatibility for existing consumers while the runtime is rewritten behind the facade

## Why This Matters

The current shape forces the app to reason about provider-specific session objects and browser redirect behavior.

That creates four recurring problems:

- the same login path behaves differently in web, native, and portal contexts
- Authentik and Supabase responsibilities blur together
- provider changes require consumer code changes
- login bugs become hard to localize because the system has no clean boundary between execution, issuer, and persistence

This refactor fixes the source of the problem instead of patching another login branch onto the existing stack.

## User-Facing Outcome

When this is complete:

1. A user starts sign-in from the app.
2. The app calls the auth facade, not a provider-specific client.
3. Social login executes through the chosen execution path.
4. The normalized identity is exchanged with the backend.
5. The backend issues the canonical app session.
6. The app restores that session consistently on refresh and relaunch.
7. The user does not need to know whether Better Auth, Authentik, or Supabase was involved.

## Scope

In scope:

- `packages/auth` facade and provider contracts
- execution providers, issuer providers, repository adapters, email adapters
- normalized identity and session models
- web/native runtime adapters and compatibility shims
- backend exchange contract
- migration docs, tests, and rollout flags

Out of scope:

- creating a second auth package
- rewriting every consumer-facing auth API in one pass
- making Better Auth the final app token authority
- storing critical authz state in Supabase metadata
- forcing Expo-only assumptions into the shared package

## Why The Reference Pattern Worked Better

The CIG web flow succeeded because browser concerns and domain auth concerns were separated cleanly.

The important lesson is not the stack. The lesson is the boundary:

- browser relay and callback orchestration stayed on the web side
- domain auth and identity provisioning stayed on the backend side
- the identity provider remained the trust anchor
- downstream systems consumed normalized identity, not raw browser session state

Alternun needs the same separation inside its own architecture.

## Success Criteria

This spec is satisfied when:

- `packages/auth` remains the single auth package used by Alternun
- app-facing auth stays stable through compatibility shims
- Better Auth can execute social login
- Authentik remains the canonical issuer/trust layer
- the final app session is canonical, not a raw execution-provider session
- Supabase is no longer the hidden auth runtime
- email behavior is abstracted behind provider contracts
- critical auth persistence is isolated behind repositories
- migration path and rollback path both exist
- the docs describe what is fixed, what remains legacy, and what still needs backend support

## Risks

- the migration can regress browser callbacks if the boundary is not enforced consistently
- legacy Supabase behavior can reappear through compatibility shortcuts
- the backend exchange contract may need more iteration than the facade contract
- web and native runtimes may need different adapters, but the consumer API must stay stable
