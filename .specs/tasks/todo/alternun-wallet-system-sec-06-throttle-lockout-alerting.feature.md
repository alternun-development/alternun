# SEC-06 — No alerting on PIN lockout spikes or IP throttle hits

**Priority:** 🟡 MEDIUM — without this, attacks are silently absorbed; team can't tell when users are under attack  
**Status:** Not started  
**Context:** IP throttling (30/min default, 10/min on sensitive endpoints) and per-user PIN lockout are both in place but emit nothing visible to the team

---

## The gap

Both defenses work silently:

- When a user's PIN is locked out (`WalletService.verifyPin`), the response changes to `{ verified: false, lockedUntil: "..." }` — no alert fires.
- When an IP exceeds the rate limit (`ThrottlerGuard`), the response becomes 429 — no alert fires.
- When many users' PINs are locked out simultaneously (credential-stuffing across many accounts from one IP), nothing is visible beyond the individual 429/lockout responses.

This means an active attack — e.g., someone testing 9,999 PINs per user from rotating IPs, or a mass lockout of user accounts — could run for hours before anyone notices, if ever.

---

## What to build

### Minimum viable (suggested first step)

Add a `Logger.warn` on PIN lockout events (already possible — `wallet.service.ts`'s `verifyPin` method already has the lockout logic):

```ts
if (failedAttempts >= LOCKOUT_THRESHOLD) {
  this.logger.warn(
    { userId, failedAttempts, lockedUntil },
    '[WALLET SECURITY] User PIN locked out after ${failedAttempts} failed attempts'
  );
}
```

Structured log lines like this can be fed into CloudWatch Metric Filters (since this app is Lambda-deployed on AWS)
to fire an alarm when N lockouts occur within a time window.

### Proper implementation

1. **Determine the monitoring stack**: Check `packages/infra/` for existing CloudWatch alarms or Sentry
   configuration — the infra team may already have log-based alerting infrastructure.
2. **Define the alert thresholds** (these need a product decision, not just an engineering one):
   - Single user: lock out after 5 attempts (already implemented) — does this need to page someone, or is it
     expected noise?
   - Across many users: e.g., > 50 unique users locked out in the last 60 minutes → this is an active attack.
   - IP rate-limit hits: > 100 429 responses from unique IPs in 5 minutes → unusual pattern.
3. **Route alerts**: Define who gets paged and via what channel (PagerDuty, Slack, email) — out of scope for
   engineering to decide unilaterally.

### ThrottlerGuard hit tracking

`@nestjs/throttler`'s default `ThrottlerGuard` emits no observable events beyond returning 429. To instrument:

```ts
// Override ThrottlerGuard to add telemetry:
@Injectable()
export class InstrumentedThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    this.logger.warn(
      { ip: req.ip, path: req.url, throttleName: throttlerLimitDetail.throttlerName },
      '[WALLET SECURITY] IP rate-limit hit'
    );
    return super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
```

---

## Files to change

- `apps/api/src/modules/wallet/wallet.service.ts` — add Logger.warn on lockout
- `apps/api/src/modules/wallet/wallet.controller.ts` or a new `InstrumentedThrottlerGuard` — hook throttle hits
- `packages/infra/` — CloudWatch metric filter + alarm (requires infra team coordination)

---

## Known limitation

IP throttling is **in-memory per Lambda container** (documented in `wallet.module.ts`'s comment). This means hit
counts don't accumulate across concurrent Lambda invocations — a sustained attack may spray across warm instances
and never hit the per-container limit. Alerting on `Logger.warn` entries in CloudWatch (which ARE shared across
Lambda instances via CloudWatch Logs) is more reliable than trying to aggregate in-process counters.
