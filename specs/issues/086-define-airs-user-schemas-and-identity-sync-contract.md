# Issue #86: Define AIRS user schemas and identity-sync contract

**Status:** open
**Created:** 2026-03-12T23:19:45Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/86

## Description

## Summary

Define the canonical AIRS user schema and identity-sync contract between Authentik-issued identities and application-owned user records.

Parent: #84

## Scope

- formalize the mapping from Authentik `iss/sub` to application-owned identity and user records
- define the canonical user DTOs for backend and admin consumers
- define user lifecycle/status fields and profile ownership rules
- define role and organization projection rules for application authorization
- document sync triggers and conflict handling for email/profile/claim changes

## Deliverables

- documented user schema and identity-mapping contract
- DTO and claim-shape expectations for `/v1/me` and user-facing/admin-safe reads
- clear rules for how identity data is synchronized into app-owned tables

## Acceptance Criteria

- app users are keyed by stable identity principals, not email
- sync rules between Authentik claims and app tables are explicit
- user/profile/admin field ownership is defined
- downstream wallet/admin/API issues can consume a stable user contract

## Dependencies

- #69 identity contract baseline
- #85 database schema baseline

## Reference

- `docs/alternun_nestjs_fastify_openapi_blueprint.md`

## Labels

type:spec, area:identity, area:backend, area:api, area:data, status:needs-validation, priority:p1

## Assignees

edcalderon
