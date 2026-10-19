# Issue #240: Add per-IP request limits to POST /auth/exchange and review sibling auth endpoints

**Status:** open
**Created:** 2026-10-06T19:52:28Z
**Updated:** 2026-10-09T15:13:52Z
**Author:** brannerXD (@brannerXD)
**URL:** https://github.com/alternun-development/alternun/issues/240

## Description

Parent: #100

## Summary

`POST /auth/exchange` currently has no request-throttling guard. A bearer request can perform Better Auth verification followed by Supabase verification, with bounded but sequential outbound calls.

Add an approved per-IP limit to the exchange and review the sibling authentication endpoints individually. The limits, proxy assumptions, and storage model should be validated against normal mobile and testnet traffic before production use.

## Evidence

- `apps/api/src/modules/auth-exchange/auth-exchange.controller.ts` defines the exchange, email sign-up, email sign-in, email verification, and social-URL endpoints without throttle decorators or a throttler guard.
- `apps/api/src/modules/auth-exchange/auth-exchange.module.ts` does not configure throttling for this controller.
- `apps/api/src/common/auth/resolve-execution-identity.ts` uses a five-second verification timeout and awaits Better Auth before conditionally verifying a bearer with Supabase.
- Cookie-only requests call Better Auth only; Supabase verification runs only when a bearer is present.
- `apps/api/src/modules/wallet/wallet.controller.ts` and `apps/api/src/modules/wallet/wallet.module.ts` provide a repository-local throttling pattern.
- The sibling endpoints perform provider work through:
  - `apps/api/src/modules/auth-exchange/services/signin.service.ts`
  - `apps/api/src/modules/auth-exchange/services/signup.service.ts`
  - `apps/api/src/modules/auth-exchange/services/email-verification.service.ts`
  - `apps/api/src/modules/auth-exchange/services/social-signin.service.ts`

## Scope

- Begin with a proposed exchange limit of 10 requests per minute per resolved client IP, subject to maintainer approval and testnet validation.
- Define trusted-proxy and client-IP extraction behavior.
- Decide whether counters must be shared across instances; document any initial instance-local limitation.
- Review separate limits for email sign-in, email sign-up, email verification, and social-URL creation.
- Evaluate parallel Better Auth and Supabase verification while preserving existing timeout, conflict, and error behavior.
- Add redacted metrics for allowed, limited, invalid, timed-out, unavailable, and conflicting outcomes.

## Acceptance criteria

- `POST /auth/exchange` enforces an approved per-IP limit and returns the standard rate-limit response.
- The threshold, proxy assumptions, storage model, and multi-instance behavior are documented and tested.
- Every sibling endpoint has an explicit throttling decision.
- Any verification concurrency change preserves cookie-only, bearer-only, dual-credential, invalid, unavailable, timeout, and unconfigured behavior.
- Load validation confirms that limited requests do not trigger unnecessary provider calls.
- No credentials or sensitive request contents are recorded in metrics.

## Dependencies

- Deployment topology and trusted-proxy configuration.
- A decision on shared throttling storage for multi-instance environments.
- An agreed policy for dual credentials when one verifier is unavailable.

## Open questions

- Is 10 requests per minute per IP appropriate for mobile carrier NATs and testnet automation?
- Should email endpoints also use a privacy-preserving account-level limit?
- Is shared storage required before production exposure?
- If verification is parallelized, how should an unavailable verifier affect the other in-flight request?

## Labels

type:task, area:identity, area:backend, area:api, status:planned, priority:p1

## Assignees

brannerXD
