# SEC-03 — Formal `/security-review` not yet run on the wallet module

**Priority:** 🟠 HIGH — required before real-user exposure per the wallet system's own non-negotiables  
**Status:** Not started  
**Scope:** Full wallet module — `packages/wallet`, `apps/api/src/modules/wallet`, all mobile wallet components

---

## What is `/security-review`

The project's skill (`/security-review`) runs a multi-agent cloud review focused on security-specific concerns,
beyond what regular code review catches. It should be run on the full wallet module before any real user can
create or interact with a real-funds wallet on this platform.

This is explicitly listed in the wallet system's non-negotiables (`active-tasks/alternun-wallet-system/README.md`):

> "/security-review runs on this module before any real-user exposure, and again before the feature-flag removal"

## What to cover in the review

### Crypto implementation correctness

- [ ] Verify PBKDF2-SHA256 derivation parameters (iterations, hash, output length) match what's claimed in the spec
- [ ] Verify AES-256-GCM nonce uniqueness — are IVs ever reused? (each encrypt call generates a fresh random IV via
      `getRandomValues`, but verify this is true across all code paths, not relying on a counter or timestamp)
- [ ] Verify AES-GCM authentication tag is not stripped/ignored on decryption (WebCrypto's `decrypt` fails
      authentication automatically — but verify the error is caught and surfaces as null/false, not swallowed)
- [ ] Verify the SLIP-0010 ed25519 implementation (`slip10Ed25519.ts`) is correct against the published spec —
      this is a from-scratch implementation (replaced `ed25519-hd-key` to eliminate the `Buffer` dependency), so
      correctness is especially important to verify independently. Known-answer tests against SLIP-0010 test
      vectors from https://github.com/satoshilabs/slips/blob/master/slip-0010.md are the right check.
- [ ] Verify `createPinDigest` → `verifyPinDigest` cross-implementation fixture still bit-identical after any
      iteration-count changes — re-run `apps/api/test/wallet-pin.test.js`

### Key material handling

- [ ] Audit for accidental key/seed/PIN persistence beyond the intended scope (React state, closures, error
      objects, module-level caches)
- [ ] Verify `wipeBytes` is called on any Uint8Array containing private key material after signing — `sign.ts`
      derives keys into local `const` variables (function-local, eligible for GC after return) but does not
      explicitly zero them; JS doesn't guarantee zeroing, so verify at least no long-lived state holds the key
- [ ] Confirm the mnemonic is never passed as a URL parameter, query string, or hash fragment at any point

### Server-side PIN verification hardening

- [ ] Verify `timingSafeEqual` is used consistently in server-side PIN comparison — `wallet-pin.ts`'s
      `verifyPinDigest` uses `timingSafeEqual` ✅ — but also check `verifyPinDigest` is the ONLY comparison path
      (no short-circuit string equality anywhere in the call chain)
- [ ] Verify the per-user lockout state (`pin_failed_attempts`, `pin_locked_until`) is updated atomically — the
      current pattern does a separate PATCH to update the counter AFTER the PIN check; under concurrent requests
      from the same user, both could read the same `pinFailedAttempts` value, fail the check, and both PATCH with
      `failedAttempts + 1` rather than the actual count after both increments. This is a race condition that
      under-counts failed attempts, potentially delaying lockout by N-1 attempts per concurrent batch.

### API surface

- [ ] Verify the `restore` endpoint properly handles the case where `upsertPrimaryWalletAccount` succeeds but a
      concurrent `setup` call creates a conflicting primary — check for TOCTOU issues in the "get then update"
      upsert pattern
- [ ] Confirm there's no path to read another user's `wallet_accounts` or `wallet_preferences` via the API
      (all queries filter by `resolveUserId(token)` — verify there are no endpoints that accept a `userId` param
      from the client, since `userId` is always derived from the bearer token server-side)

### Broadcast endpoint

- [ ] Verify the `signedTransaction` field in the broadcast request is not logged anywhere in the API
      (the signed transaction reveals nothing a blockchain explorer wouldn't already know, but it's still cleaner)
- [ ] Consider rate-limiting the broadcast endpoint more aggressively than the general `30/min` — a single signed
      transaction costs real gas/fees; a user shouldn't be able to broadcast 30 txs/min even if the fee is theirs

## When to run

Before any of:

- The wallet section becoming publicly accessible (not just in dev/testing)
- Any marketing or announcement about a "self-custody wallet" feature
- Feature flag removal for general availability

## Related findings already documented

- SEC-01: offline PIN brute-force on web localStorage
- SEC-02: RLS policies missing from wallet tables
