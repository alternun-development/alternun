# Issue #100: Better Auth testnet rollout: finish validation and remaining migration work

**Status:** open
**Created:** 2026-04-16T23:16:22Z
**Updated:** 2026-10-09T15:14:59Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/100

## Description

## Summary

Issue #99 is resolved. The live testnet API now mounts Better Auth on `/auth/*`, and `POST https://testnet.api.alternun.co/auth/sign-in/social` returns a Google OAuth redirect instead of 404.

This follow-up tracks the remaining Better Auth rollout work that is still pending: end-to-end validation, canonical issuer exchange/persistence checks, email cutover decisions, and documentation sync.

## Scope

- Validate the live testnet auth flows end to end
- Confirm callback and return-to behavior on web
- Verify repeated sign-in, sign-out, and session restoration paths
- Confirm principal exchange, linked account, and provisioning behavior remain correct in deployment
- Track any remaining persistence or email-cutover work as separate issues if needed
- Sync repo docs with the actual deployed state

## Deliverables

1. Live validation matrix for Google, GitHub, email/password, sign-out, and repeated login
2. Callback and session smoke checks for the testnet API/runtime
3. Follow-up issues for any gaps found in validation
4. Updated docs that match the real repo/runtime state

## Acceptance Criteria

- The current testnet route stays healthy and documented
- Callback and return-to behavior are validated
- Remaining migration gaps are broken into tracked follow-up work if they appear
- Docs reflect the actual deployed state, not the pre-fix hypothesis

## Dependencies

- `dashboard-dev` testnet API/auth runtime
- OAuth provider credentials and callback registrations
- Backend exchange contract at `POST /auth/exchange`
- The current Better Auth runtime fix in `apps/api`

## References

- Closed issue: #99
- Execution plan: `docs/alternun-better-auth-testnet-execution-plan.md`
- Runtime fix: `apps/api/src/common/bootstrap/better-auth-runtime.ts`
- Regression test: `apps/api/test/better-auth-runtime.test.js`

## Current repository state — 2026-10-09

The repository is at `develop` / `v1.1.92`. Better Auth is mounted in the API and the testnet route is live, but this epic is not complete:

- PR #237 (credentialed CORS allowlist) is still open.
- PR #238 (verified exchange credentials) is still open and stacked on the auth rollout.
- #242 is the active testnet signup/email-delivery investigation.
- #239, #240, and #241 are the remaining identity-compatibility, abuse-control, and recovery follow-ups.
- Testnet validation must be rerun after #237 and #238 are deployed; the existing validation evidence predates them.

## Delegation order

1. Deploy and validate #237 and #238 together.
2. Resolve #242 before declaring email/password sign-in healthy.
3. Keep #239, #240, and #241 as independently delegable follow-ups.
4. Update the validation matrix and close this epic only after the acceptance criteria are evidenced on testnet.

## Labels

type:epic, area:identity, area:infra, area:backend, status:needs-validation, priority:p1

## Assignees

edcalderon
