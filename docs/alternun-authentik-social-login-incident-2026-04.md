# Alternun Authentik Social Login Incident - April 2026

This document records the Authentik social-login instability that affected AIRS web on testnet during April 2026.

It exists because the root problem was not a single bug. It was configuration drift across:

- the AIRS web bundle
- the shared auth package
- Authentik source-flow bootstrap logic
- deployment/runtime env propagation

## Summary

The visible symptoms were:

- Google login looping between AIRS, Authentik, and Google
- AIRS web showing Supabase-looking social fallback instead of the intended Authentik-first path
- stale Authentik screens such as custom starter flows, direct source callback failures, or repeated account chooser screens
- local and testnet behaving differently for reasons that were not obvious from repo env files alone

The final stable direction is:

- web uses direct source login by default
- native remains runtime-specific and separate
- browser callback handling stays on `/auth/callback`
- custom Authentik outer starter flows are explicit-only and not the deployed default

## Scope

Affected surface:

- `apps/mobile` web delivery for AIRS
- `packages/auth`
- `packages/infra` Authentik bootstrap

Primary affected environments:

- `testnet.airs.alternun.co`
- `testnet.sso.alternun.co`

## Root Causes

### 1. Runtime and callback responsibilities were mixed

Expo web had drifted too close to the native path.

That caused confusion around:

- where the callback should terminate
- where session state should be restored
- whether `/auth` or the sign-in UI itself was responsible for finalization

The fix was to keep:

- web on a dedicated callback route
- native on its own runtime-specific entry path

### 2. Shared auth package and deployed bundle could drift

The AIRS app consumes compiled shared package output.

At several points the source code and the emitted runtime artifacts did not match, so the deployed web bundle behaved differently from the current repo source.

This made the fallback behavior look like an env problem when it was actually an artifact mismatch.

### 3. Custom outer Authentik starter flows and direct source login were mixed together

There were two valid patterns:

- direct source login
- custom outer source-stage starter flow

The problem was switching between them incompletely.

Examples:

- AIRS web in direct-source mode while Authentik still expected `alternun-google-login`
- Authentik source callback path active while the source `authentication_flow` had been cleared
- custom starter flow active while the AIRS bundle no longer referenced it

### 4. Direct-source bootstrap stripped required login stages

This was the most important server-side bug.

In direct-source mode, the bootstrap still pruned `UserLoginStage` from:

- `default-source-authentication`
- `default-source-enrollment`

That left Google callback without a valid session-completion path inside Authentik, which caused repeated redirects and apparent login loops.

The fix was:

- direct-source mode must keep `default-source-authentication` and `default-source-enrollment` open (`authentication=none`)
- direct-source mode must prune `UserLoginStage` from both flows
- custom outer flow mode also prunes those stages and lets the outer `SourceStage` own the handoff
- the web app should not force a logout on the direct `authentik` social path by default; stale browser/session state is handled better by starting from a clean source flow than by replaying logout-first on every attempt
- a separate logout-first custom mode is still experimental and should not be treated as the default fix for stale browser sessions

## Final Expected State

### AIRS web bundle

- `EXPO_PUBLIC_AUTHENTIK_LOGIN_ENTRY_MODE=source`
- `EXPO_PUBLIC_AUTHENTIK_SOCIAL_LOGIN_MODE=authentik`
- `EXPO_PUBLIC_AUTHENTIK_PROVIDER_FLOW_SLUGS` empty by default
- `EXPO_PUBLIC_AUTHENTIK_ALLOW_CUSTOM_PROVIDER_FLOW_SLUGS=false` by default

### Authentik source configuration

- Google source `authentication_flow = default-source-authentication`
- Google source `enrollment_flow = default-source-enrollment`
- `default-source-authentication.authentication = none`
- `default-source-enrollment.authentication = none`
- `default-source-authentication` does not contain `UserLoginStage`
- `default-source-enrollment` does not contain `UserLoginStage`
- if a custom Google starter flow is enabled, `INFRA_IDENTITY_GOOGLE_LOGIN_FLOW_MODE=source` keeps the direct source path and `logout-then-source` remains experimental while it inserts `UserLogoutStage` before `SourceStage`

### Browser routing

- AIRS login page: `/auth`
- AIRS callback page: `/auth/callback`
- AIRS relay page: `/auth-relay` only when explicitly chosen
- mobile logout returns to the AIRS app root via the mobile launch URL origin when no explicit post-logout redirect list is set

## What We Changed

The main durable changes were:

- explicit runtime split in the shared auth package
- explicit browser callback route
- explicit social-login mode switch
- web fresh-session handling now follows whether social login is still Authentik-managed, not whether the dormant Better Auth execution path exists
- explicit allow flag for custom provider-flow slugs
- source auth/enrollment flows now stay open (`authentication=none`) so the browser can resume after the upstream Google callback instead of hitting the current-user gate
- direct-source default for deployed bundles
- Google source enrollment now auto-fills the username from the upstream Google email, so first-time logins do not stop on the Authentik username screen
- removal of hidden custom-flow derivation
- Authentik bootstrap fix to prune `UserLoginStage` from direct-source mode
- the identity deploy template now reapplies the Authentik source-stage runtime hotfix on every identity rollout so the live container does not regress to the `FlowToken` delete crash after redeploys
- export and predeploy guards now fail builds that still embed stale Better Auth web login paths into AIRS web bundles or env

## Operational Checks

When debugging this path again, verify in this order:

1. the live AIRS web bundle being served by testnet
2. the effective public auth env embedded into that bundle
3. Authentik Google source `authentication_flow` and `enrollment_flow`
4. bindings on `default-source-authentication`
5. bindings on `default-source-enrollment`
6. whether a custom outer flow such as `alternun-google-login` still exists

Do not stop at checking repo `.env` files. The broken state can live in the deployed bundle or on the Authentik server even when the repo looks correct.

## Preventive Rules

- deployed AIRS web must stay on direct source login unless a custom starter flow is explicitly being tested
- changes to auth behavior must update both public architecture docs and internal incident/operating notes
- live Authentik flow bindings must be inspected whenever browser redirects loop after upstream social login succeeds
- release and deployment validation should check both the bundle and the Authentik source-flow state

## Related Code Paths

- `packages/auth/src/mobile/runtimeSignIn.ts`
- `packages/auth/src/mobile/authEntry.ts`
- `packages/auth/src/mobile/authentikUrls.ts`
- `packages/auth/src/mobile/authentikClient.ts`
- `apps/mobile/app/auth.tsx`
- `apps/mobile/app/auth/callback.tsx`
- `apps/mobile/app/auth-relay.tsx`
- `apps/mobile/components/auth/AuthSignInScreen.tsx`
- `apps/mobile/components/auth/AppAuthProvider.tsx`
- `packages/infra/config/pipelines/specs/core.ts`
- `packages/infra/scripts/templates/bootstrap-authentik-integrations.py`
