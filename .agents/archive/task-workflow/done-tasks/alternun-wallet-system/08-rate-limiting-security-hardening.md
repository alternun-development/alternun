---
name: wallet-rate-limiting-security-hardening
title: IP/global throttling, logging/redaction audit (per-user PIN lockout already done in task 02)
priority: high
status: implemented-pending-security-review
depends_on: [wallet-server-module-api]
completed: 2026-06-30
revision_note: >
  Per-user PIN lockout (item 1 below) was implemented directly in task 02 (apps/api/src/modules/wallet/
  wallet.service.ts) since verify-pin had no real protection without it. Do not re-implement — it's done,
  with a regression test (apps/api/test/wallet-pin.test.js). This task's remaining scope is IP/global
  throttling and the logging/redaction audit.
---

# Task 08 — Rate limiting & security hardening

See `00-SPEC.md` §2 rule 3, §3.2, §5's `verify-pin` row. This repo has **no existing rate-limiting
infrastructure** in `apps/api` (confirmed: no `@nestjs/throttler` or custom throttling middleware found) — this
task introduces the first instance of it, so get the pattern right since other endpoints will likely reuse it.

## Scope

1. ✅ **Per-user PIN lockout — already done in task 02.** Exponential backoff (1m/5m/15m/1h/24h after 5 failed
   attempts), reset-on-success, machine-readable `lockedUntil` in the response. See
   `apps/api/src/modules/wallet/wallet.service.ts`'s `verifyPin` method.
2. **IP/global throttling** as a second, coarser layer: evaluate `@nestjs/throttler` for the wallet module's
   routes generally (setup/accounts/verify-pin/balances/activity/broadcast), since none of `apps/api`'s existing
   modules have this and the wallet module is the highest-value target in the API surface.
3. **Logging/redaction audit**: grep the finished task 02 implementation for any place a PIN, PIN digest/hash, or
   salt could end up in a log line, error message, or exception stack (e.g. an unhandled exception that dumps the
   request body) — add explicit redaction/allowlisting rather than trusting that nothing logs it by omission. Note
   the server never sees a mnemonic/seed/private key at all under the device-only model (`00-SPEC.md` §1/§4), so
   this audit is specifically about the PIN-verifier fields, not seed material.
4. **Alerting**: hook lockout events into whatever monitoring this repo already uses (check for existing
   Sentry/CloudWatch alarm patterns in `packages/infra`) so a spike in `verify-pin` failures across many users is
   visible to the team, not just silently absorbed by per-user lockouts.
5. Run `/security-review` against the full wallet module (tasks 01-03, 07-08) before this ships behind a feature
   flag to any real users, and again before the feature flag is removed for general availability.

## 2026-06-30 implementation

- **IP/global throttling**: added `@nestjs/throttler` (v6, the first instance of throttling infra in `apps/api`),
  scoped to the wallet module only (`ThrottlerModule.forRoot` inside `wallet.module.ts`, `@UseGuards(ThrottlerGuard)`
  on `WalletController`) rather than as a global `APP_GUARD`, since no other module has this yet — easy to extend
  later. Default: 30 req/min per IP across the module. A stricter `SENSITIVE_THROTTLE` (10 req/min) is applied via
  `@Throttle()` to `setup`, `restore`, and `verify-pin` specifically — the endpoints where a single IP hammering
  many different accounts is the real risk (verify-pin brute-forcing, account-creation/takeover-adjacent abuse).
  **Verified live, not just unit-tested**: ran the actual API server and hit `/wallet/verify-pin` 13 times in a
  row — requests 1-10 passed through (401, no token), requests 11-13 correctly returned 429. Hit
  `/wallet/balances` 12 times in the same window — all 401 (no 429), confirming the looser module-wide default
  applies there, not the sensitive override.
  - **Known limitation, documented in `wallet.module.ts`**: this app runs on AWS Lambda; the default in-memory
    `ThrottlerStorage` is per-container, not shared across concurrent invocations/cold starts. Real protection
    against distributed abuse would need a Redis-backed storage — out of scope here, flagged as a follow-up.
- **Logging/redaction audit**: verified empirically, not just by code review — started an isolated local API
  instance, sent requests with deliberately distinctive marker values in `pin`/`pinSalt`/`pinHash` fields, and
  grepped the full captured stdout/stderr for those markers: none appeared. Also confirmed validation-error
  responses (`ValidationPipe`) and Supabase REST error messages (`wallet.repository.ts`'s `restRequest`) never
  echo back submitted field values — only constraint/error descriptions. Fastify's built-in request logger
  (`logger: true` in `create-app.ts`) only logs method/url/status/responseTime by default, no body capture is
  configured anywhere in this app. No PIN-adjacent secret found anywhere in logs or error responses.
- **Alerting (item 4) — not done.** No existing Sentry/CloudWatch alarm pattern was found in `packages/infra` to
  hook into for this; would need its own scoping (what counts as a "spike," who gets paged) rather than a
  mechanical addition here. Left as an open item.

## Acceptance criteria

- [x] Exponential backoff lockout implemented and unit-tested (including the reset-on-success path) — task 02.
- [x] IP/global throttling applied to all wallet routes (30/min default, 10/min on setup/restore/verify-pin) —
      verified live against a running server, not just typechecked.
- [x] No PIN-adjacent secret found in logs — verified empirically (marker-value grep against real captured
      server output), not just a code review.
- [ ] Alerting on lockout/throttle spikes — not done, no existing alerting pattern to hook into (see above).
- [ ] `/security-review` not yet run — still required before any real-user exposure per the non-negotiables in
      the system README.
