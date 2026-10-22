# Issue #84: Track AIRS backend, data, wallet, and blockchain delivery

**Status:** open
**Created:** 2026-03-12T23:19:42Z
**Updated:** 2026-10-09T15:14:57Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/84

## Description

## Summary

Track the next AIRS application delivery stream after the current identity baseline work in #69.

This epic covers the application-owned backend/data contracts that need to exist before AIRS can move cleanly from identity bootstrap into wallet operations and blockchain-backed product behavior.

## Why

The repo already contains architectural direction for:

- backend/API shape
- application data ownership
- wallet provisioning
- AIRS token and pool flows

What is missing is a structured GitHub issue flow that turns those specs into an executable backlog.

## Scope

- define the application database schema baseline
- define the user and identity-sync schema/contract
- track wallet registration and provisioning integration
- define the AIRS smart-contract MVP and off-chain integration contract
- keep dependencies back to the identity track explicit

## Execution Order

1. #85
2. #86
3. #87
4. #88

## Child Issues

- [ ] #85 Specify AIRS application database schema and migration baseline
- [ ] #86 Define AIRS user schemas and identity-sync contract
- [ ] #87 Implement AIRS wallet registration and provisioning integration
- [ ] #88 Define AIRS smart-contract MVP and backend integration contract

## Out of Scope

- replacing the existing identity epic in #69
- production cutover of the identity stack
- full implementation of every AIRS runtime surface in one issue

## Acceptance Criteria

- child issues exist for each major delivery area
- execution order and dependencies are explicit
- this epic is used as the parent tracker for the next AIRS backend/blockchain stream

## Dependencies

- #69 must progress far enough that identity/JWT assumptions are stable for app-layer work

## Reference

- `docs/alternun_nestjs_fastify_openapi_blueprint.md`
- `docs/refine_admin_integration_issue.md`
- `docs/airs-impact-token-spec.md`

## Current repository state — 2026-10-09

The repo already contains the AIRS API/service layer, ledger and dashboard migrations, identity-sync migrations, and the wallet API/mobile implementation. The remaining AIRS delivery split is:

- #85: application schema and balance ownership; implementation exists but needs schema/migration validation.
- #86: user and identity-sync contract; implementation exists but needs contract validation.
- #87: wallet registration/provisioning; API and persistence exist, with end-to-end and security validation still required.
- #88: smart-contract MVP and off-chain event contract; no on-chain implementation is present, so this remains planned.

The former wallet umbrella issues #101 and #104 are now treated as implementation history/validation, not a second delivery track.

## Labels

type:epic, area:backend, area:data, area:wallet, area:blockchain, status:in-progress, priority:p1

## Assignees

edcalderon
