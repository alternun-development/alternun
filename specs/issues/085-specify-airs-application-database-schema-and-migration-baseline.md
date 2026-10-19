# Issue #85: Specify AIRS application database schema and migration baseline

**Status:** open
**Created:** 2026-03-12T23:19:44Z
**Updated:** 2026-10-09T15:14:32Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/85

## Description

## Summary

Define the application-owned Postgres schema and migration baseline for the AIRS backend.

Parent: #84

## Scope

- formalize the canonical app-owned tables for identity, users, organizations, memberships, wallets, outbox events, and audit logs
- define primary keys, foreign keys, unique constraints, indexes, and timestamp conventions
- decide which data stays in Authentik/Supabase-managed identity state vs application-owned tables
- define enum/status conventions for core records
- define the initial migration ordering and rollback expectations

## Deliverables

- reviewed schema specification or ERD
- initial migration baseline or explicit migration plan
- ownership map for identity, app-user, wallet, organization, membership, outbox, and audit records

## Acceptance Criteria

- canonical tables and relationships are documented and agreed
- migration ordering is clear enough for implementation to start
- critical constraints and status fields are defined
- wallet/user/org work no longer depends on implicit or ad hoc schema assumptions

## Dependencies

- identity assumptions from #69

## Reference

- `docs/alternun_nestjs_fastify_openapi_blueprint.md`

## Current repository state — 2026-10-09

The repository has a substantial application schema and migration history in `supabase/migrations/`, including identity sync, AIRS ledger/dashboard functions, referrals, achievements, notifications, and wallet tables. Treat this issue as validation of the canonical ownership/ordering contract rather than a greenfield schema design.

The dedicated AIRS balance extraction from #125 is an explicit remaining child deliverable: `public.airs_balances` is not present yet, and the backfill, trigger/RPC cutover, and safe removal of the legacy user columns must be designed and validated here.

## Labels

type:spec, area:backend, area:data, status:needs-validation, priority:p1

## Assignees

edcalderon
