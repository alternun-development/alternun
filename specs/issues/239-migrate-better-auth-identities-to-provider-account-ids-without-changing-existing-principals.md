# Issue #239: Migrate Better Auth identities to provider account IDs without changing existing principals

**Status:** open
**Created:** 2026-10-06T19:51:45Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** brannerXD (@brannerXD)
**URL:** https://github.com/alternun-development/alternun/issues/239

## Description

Parent: #100

## Summary

The client currently derives `externalIdentity.providerUserId` from the Better Auth user/session ID rather than the linked Google or Discord account ID. The API derives the canonical principal subject from the issuer, provider, and this value.

Changing the identifier directly could therefore create different principal subjects for existing users. The authoritative provider-account source and a compatibility migration must be defined before clients begin sending provider account IDs.

## Evidence

- `packages/auth/src/providers/better-auth/BetterAuthExecutionProvider.ts` falls back through `user.sub`, `user.id`, and `session.userId` when normalizing an external identity.
- `packages/auth/src/identity/claims.ts` maps that subject to `providerUserId`.
- `apps/api/src/common/auth/resolve-execution-identity.ts` verifies a Better Auth session and currently reports `user.id` as `providerUserId`.
- `apps/api/src/modules/auth-exchange/auth-exchange.mapper.ts` derives the principal subject from `${issuer}:${provider}:${providerUserId}`.
- `apps/api/src/modules/auth-exchange/auth-exchange.service.ts` retains a temporary provider allowlist and requires the body `providerUserId` and normalized email to match the verified Better Auth user.

## Scope

- Select the authoritative Better Auth account record and field for each social provider.
- Inventory mappings between Better Auth user IDs, provider account IDs, and existing Alternun principal/app-user records.
- Classify missing, ambiguous, and conflicting mappings before cutover.
- Design a versioned compatibility representation that recognizes both identifiers without creating a second principal.
- Backfill provider-account aliases before clients send the new identifier.
- Roll out clients gradually with reconciliation metrics and a bounded rollback window.
- Remove the temporary body-provider compatibility behavior only after the migration gate is met.

## Acceptance criteria

- The migration design documents the authoritative ID source, uniqueness rules, collision handling, rollback path, and audit measurements.
- Every existing testnet Better Auth identity is classified as mapped, ambiguous, or unresolved before cutover.
- Repeated login before, during, and after migration resolves to the same canonical principal and app-user record.
- New logins use provider account IDs without duplicating existing users.
- The temporary compatibility behavior remains covered until the final legacy client cohort is retired.
- Migration logs contain no raw tokens or unnecessary identity values.

## Dependencies

- A decision on durable principal and linked-account persistence.
- Access to the authoritative Better Auth account data and a safe backfill mechanism.
- Published-client rollout and rollback visibility.

## Open questions

- Which Better Auth API or database record is authoritative for provider account IDs?
- Can one Better Auth user have multiple accounts for the same provider?
- Should the old internal ID remain as a permanent alias?
- Which metric demonstrates that legacy clients no longer need the temporary compatibility behavior?

## Labels

type:task, area:identity, area:backend, area:data, status:planned, priority:p1

## Assignees

brannerXD
