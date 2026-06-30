# TECH-01 — WalletService has no mocked-repository unit tests

**Priority:** 🟡 MEDIUM — correctness risk; bugs in core service logic go uncaught until live/integration testing  
**Status:** Not started

---

## What's missing

`apps/api/src/modules/wallet/wallet.service.ts` is the highest-value piece of server logic in the whole wallet
system — it contains PIN lockout backoff, rate limiting, user identity resolution, and multi-table write
orchestration. It has:

- ✅ An integration-level smoke test (repository functions against a live dev DB, done ad-hoc, not committed)
- ✅ A cross-implementation PIN digest fixture (`apps/api/test/wallet-pin.test.js`)
- ✅ Chain adapter tests (`apps/api/test/wallet-chain-adapters.test.js`)
- ❌ **Zero unit tests for the service layer itself** — no test exercises `setup()`, `restore()`, `verifyPin()`,
  `setPrimaryAccount()`, or their error/lockout paths without a real DB

## What needs to be built first

The project's test runner is Node's built-in `node:test` (not Jest). Module-mocking requires
`--experimental-test-module-mocks` flag (available in Node 22 but not wired into the current test script):

```json
// apps/api/package.json — current:
"test": "node -r ts-node/register/transpile-only --test test/*.test.js test/*.test.ts"

// needs:
"test": "node --experimental-test-module-mocks -r ts-node/register/transpile-only --test test/*.test.js test/*.test.ts"
```

This flag is additive — it doesn't break existing tests. Check that existing tests still pass before adding new
ones that use `mock.module()`.

Alternatively, restructure `wallet.service.ts` to accept repository functions as injected dependencies
(constructor parameters or a dedicated repository class injected via NestJS DI), making the service fully
testable without module-level mocking.

## Tests to write once infra is in place

### `wallet.service.setup()`

- Happy path: creates preferences and account, returns account record
- Conflict: throws ConflictException when `hasLocalWallet` is already true
- Partial failure: if `createWalletPreferences` succeeds but `insertWalletAccount` throws, test that the error propagates

### `wallet.service.verifyPin()`

- Correct PIN + no lockout: returns `{ verified: true }` and resets failure counter
- Wrong PIN (below threshold): returns `{ verified: false, remainingAttempts: N }`
- Wrong PIN (at threshold): returns `{ verified: false, lockedUntil: "<iso>" }` and PATCHES lockout
- Already locked: returns `{ verified: false, lockedUntil }` without attempting PIN comparison
- No PIN set: throws UnauthorizedException
- **Race condition** (two concurrent wrong-PIN calls): both should read the SAME failedAttempts and both write
  `failedAttempts + 1` — current result is under-count. A test that fires two concurrent calls and checks the
  post-state would expose this. Fix would require a DB-level atomic increment or an advisory lock.

### `wallet.service.restore()`

- No existing wallet: equivalent to setup (creates preferences + account)
- Existing wallet: upserts preferences (new PIN digest) and upserts primary account (new addresses)
- Preserves non-primary accounts (restore only touches the primary)

### `wallet.service.setPrimaryAccount()`

- Account belongs to user: swaps primary successfully, returns updated list
- Account doesn't belong to user: throws ForbiddenException
- Only one account: succeeds (no previous primary to unset)

## Files to change

- `apps/api/package.json` — add `--experimental-test-module-mocks` to test script
- New: `apps/api/test/wallet-service.test.ts` — mocked-repo service tests
