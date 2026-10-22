# Issue #87: Implement AIRS wallet registration and provisioning integration

**Status:** open
**Created:** 2026-03-12T23:19:47Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/87

## Description

## Summary

Implement the AIRS wallet registration, linking, and provisioning flow across API, worker, and persistence layers.

Parent: #84

## Scope

- define the wallet account lifecycle for registered, linked, provisioned, failed, and disabled states
- implement API-level wallet registration/linking/provision requests
- use async processing for provisioning and follow-up jobs instead of inline blocking requests
- define custody and chain support assumptions for MVP
- ensure audit logging, idempotency, and retry behavior exist for wallet operations

## Deliverables

- tracked API/worker/persistence flow for wallet registration and provisioning
- stable wallet state model and operational transitions
- validation checklist covering happy path, retries, and failure handling

## Acceptance Criteria

- wallet registration/linking/provisioning flow is defined and tracked end to end
- provisioning does not rely on ad hoc inline logic
- wallet records and status transitions are auditable
- dependencies on user schema and DB schema are explicit

## Dependencies

- #85 database schema baseline
- #86 user schema and identity-sync contract

## Reference

- `docs/alternun_nestjs_fastify_openapi_blueprint.md`
- `docs/refine_admin_integration_issue.md`

## Labels

type:feature, area:backend, area:api, area:wallet, status:needs-validation, priority:p1

## Assignees

edcalderon
