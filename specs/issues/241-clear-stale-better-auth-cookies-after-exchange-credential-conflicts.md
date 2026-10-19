# Issue #241: Clear stale Better Auth cookies after exchange credential conflicts

**Status:** open
**Created:** 2026-10-06T19:52:58Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** brannerXD (@brannerXD)
**URL:** https://github.com/alternun-development/alternun/issues/241

## Description

Parent: #100

## Summary

Browser exchange requests send ambient cookies and may also send an explicit bearer. The server currently returns HTTP `401` whenever both credentials verify, without determining whether they represent the same identity.

The client then falls back to compatibility/local state after the backend exchange fails. This can leave a stale Better Auth cookie in place and make the conflict difficult to resolve predictably.

Add a status-aware recovery path that clears only the stale Better Auth cookie through a supported server response, preserves the selected valid session, and retries the exchange at most once.

## Evidence

- `packages/auth/src/providers/authentik/AuthentikIssuerProvider.ts` uses `credentials: 'include'`, adds an explicit bearer when available, and falls back locally after backend exchange failure.
- `packages/auth/src/facade/AlternunAuthFacade.ts` catches exchange failures and permits compatibility state to remain visible.
- `apps/api/src/common/auth/resolve-execution-identity.ts` rejects any request with more than one verified outcome as conflicting.
- `packages/auth/src/providers/better-auth/BetterAuthExecutionProvider.ts` has a general sign-out path, but it may also sign out the legacy email fallback. There is no conflict-specific cookie cleanup path.

## Scope

- Introduce a typed, status-aware client recovery path for credential conflicts.
- Clear the Better Auth cookie through the supported server sign-out response rather than attempting to manipulate an HTTP-only cookie directly.
- Preserve the valid Supabase session when the selected recovery policy requires it.
- Avoid the broad sign-out path if it would clear both execution sessions.
- Retry the exchange at most once after confirmed cleanup.
- Surface a clear reauthentication state if cleanup fails or the remaining credential cannot be verified.
- Exclude provider outages and unrelated HTTP `401` responses from automatic cleanup.

## Acceptance criteria

- A stale Better Auth cookie plus a valid Supabase bearer reaches a deterministic recovery or reauthentication result.
- The selected valid session is not unintentionally cleared.
- Cookie deletion is verified on web and every native cookie-store path used by supported clients.
- Recovery retries no more than once and records only a redacted outcome.
- Tests cover same-user dual credentials, different-user dual credentials, an expired cookie, failed cleanup, and provider unavailability.

## Dependencies

- A typed exchange error contract that distinguishes credential conflicts from other failures.
- A targeted Better Auth cookie invalidation operation with confirmed behavior across supported runtimes.

## Open questions

- Should two valid credentials for the same identity be accepted, normalized, or treated as a conflict?
- If two valid credentials represent different identities, should the client preserve Supabase, preserve Better Auth, or require user confirmation?
- Can Better Auth expose a cookie-only sign-out operation without clearing the legacy session?
- Should automatic recovery be controlled by a client-version gate or rollout flag?

## Labels

type:task, area:identity, area:backend, status:planned, priority:p1

## Assignees

brannerXD
