---
name: wallet-rate-limiting-security-hardening
title: IP/global throttling, logging/redaction audit (per-user PIN lockout already done in task 02)
priority: high
status: todo
depends_on: [wallet-server-module-api]
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

## Acceptance criteria

- [ ] Exponential backoff lockout implemented and unit-tested (including the reset-on-success path).
- [ ] IP/global throttling applied to all wallet routes.
- [ ] No PIN-adjacent secret found in logs during a manual review of a full setup→verify-pin→lockout test cycle
      (grep actual log output, don't just review the code for `console.log`/`logger.log` calls — middleware or
      framework-level request logging can leak fields the handler code never explicitly logs).
- [ ] `/security-review` findings addressed or explicitly accepted-with-rationale before feature-flag removal.
