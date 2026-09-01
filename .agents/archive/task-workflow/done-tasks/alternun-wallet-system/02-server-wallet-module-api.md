---
name: wallet-server-module-api
title: New apps/api wallet module — setup, PIN re-verification gate, lockout
priority: high
status: implemented
depends_on: [wallet-db-schema-migration]
completed: 2026-06-29
revision_note: >
  Rev. 2 — no AWS KMS / envelope encryption needed (00-SPEC.md §4). The server never stores or sees secret
  material; this module only manages public addresses (wallet_accounts) and a PIN re-verification gate
  (wallet_preferences.pin_hash/pin_salt + lockout columns), both already migrated in task 01.
  Lockout/backoff logic (originally task 08) was folded in here since verify-pin has no real protection
  without it — task 08 still owns IP/global throttling and the logging/redaction audit.
  balances/activity/broadcast endpoints were NOT built in this pass — left for task 07, see below.
---

# Task 02 — Server wallet module

See `00-SPEC.md` §5. Mirrors the existing module shape used by AIRS (controller → service → repository), reusing
bearer-token auth exactly like `airs.controller.ts:58-79`.

## What was built

- `apps/api/src/modules/wallet/wallet.module.ts` / `.controller.ts` / `.service.ts` / `.repository.ts` /
  `wallet-pin.ts` / `dto/wallet.dto.ts`. Registered in `apps/api/src/app.module.ts`.
- `POST /v1/wallet/setup` — `{ pinSalt, pinHash, account: {derivationIndex, evmAddress, bitcoinAddress,
solanaAddress} }`. Creates `wallet_preferences` (`has_local_wallet=true`) + the primary `wallet_accounts` row.
  Rejects (409) if a wallet already exists for this user. **No secret material in the request body — verified by
  the DTO shape, there is no field that could carry one.**
- `POST /v1/wallet/accounts` — adds further accounts (public addresses only), requires an existing wallet.
- `GET /v1/wallet/accounts` — lists the requesting user's accounts.
- `POST /v1/wallet/verify-pin` — the §3.2 gate, with exponential-backoff lockout folded in (1m/5m/15m/1h/24h after
  5 failed attempts), and on success creates a short-lived `wallet_sessions` row (5 min TTL) for the "skip the
  second 'are you sure'" UX convenience described in the spec — does not skip re-derivation.
- **Extracted `resolveUserId` into `apps/api/src/common/auth/resolve-user-id.ts`**, shared between this module and
  `airs.service.ts` (which previously had its own private copy). This was a deliberate, minimal refactor — see the
  diff on `airs.service.ts`, only the simple userId-only resolver was extracted; `buildVerifySessionToken`'s own
  Supabase/Better-Auth helpers (which return more than a bare userId) were left in place, untouched.
- `wallet-pin.ts`: Node-side `computePinDigest`/`verifyPinDigest` mirroring
  `packages/wallet/src/storage/secureVault.ts`'s WebCrypto PBKDF2 derivation. **Verified empirically, not just by
  reading both implementations**: captured a real `{pin, salt, hash}` triple from the client package's
  `createPinDigest('123456')` and confirmed Node's `crypto.pbkdf2Sync` with the same iterations/hash/length
  produces the bit-identical hash. That fixture is now a permanent regression test
  (`apps/api/test/wallet-pin.test.js`) — if it ever fails, the two implementations have drifted and verify-pin
  will start rejecting correct PINs for real users. Comparison uses `crypto.timingSafeEqual`, not a hand-rolled
  loop or `===`.

## Explicitly deferred to other tasks (not built in this pass)

- `GET /v1/wallet/balances`, `GET /v1/wallet/activity`, `POST /v1/wallet/broadcast` — task 07's scope. Decided
  **not** to add stub/501 routes for these; adding routes that don't work yet is worse than no route at all (a
  client could ship against a stub and silently rely on a 501 instead of failing loudly at integration time).
- IP/global throttling (`@nestjs/throttler`) and the logging/redaction audit — still task 08's scope, the per-user
  PIN lockout above is necessary-but-not-sufficient per the spec's defense-in-depth framing.

## Acceptance criteria

- [x] No endpoint accepts or could accept a PIN's derived encryption key, a mnemonic, or any private-key material —
      verified by inspecting every DTO field; only `pinSalt`/`pinHash` (verifier-grade) and public addresses exist
      anywhere in the request/response shapes.
- [x] Cross-implementation PBKDF2 fixture test passes — empirically captured, not assumed (see above).
      `pnpm --filter @alternun/api run test` → 4/4 new tests pass, plus the rest of the existing suite (97/98,
      the 1 failure is `referrals.service.test.js`, confirmed pre-existing on `develop` via `git stash`, unrelated).
- [x] `crypto.timingSafeEqual` used for the hash comparison.
- [x] Swagger/OpenAPI docs (`@ApiOperation`/`@ApiOkResponse`) on all four routes.
- [x] `pnpm --filter @alternun/api run type-check` clean; existing test suite unaffected (confirmed the one
      pre-existing failure is unrelated and present before these changes too).
