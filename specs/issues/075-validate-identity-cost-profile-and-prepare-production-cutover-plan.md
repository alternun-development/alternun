# Issue #75: Validate identity cost profile and prepare production cutover plan

**Status:** open
**Created:** 2026-03-07T23:04:46Z
**Updated:** 2026-10-09T15:13:51Z
**Author:** edcalderon (@edcalderon)
**URL:** https://github.com/alternun-development/alternun/issues/75

## Description

## Summary

Validate operating cost and performance for the lean identity deployment, then prepare the production cutover plan.

Parent: #69

## Scope

- Measure idle and normal-load resource usage on EC2 and RDS
- Validate that the selected instance sizes are sufficient for initial production load
- Confirm cost remains within the lean target band or document justified variance
- Define scaling thresholds and the first upgrade path
- Define cutover steps for enabling Authentik as the production identity provider
- Define rollback steps if authentication or authorization fails after cutover
- Verify web and mobile auth flows as part of cutover readiness

## Deliverables

- Cost and performance validation notes
- Scaling threshold recommendations
- Production cutover checklist and rollback plan

## Acceptance Criteria

- Actual cost forecast is documented
- Resource utilization is measured and reviewed
- Scaling triggers are recorded
- Cutover and rollback steps are documented and testable
- Remaining launch blockers are explicitly listed

## Dependencies

- Infrastructure, runtime, Supabase integration, and ops issues substantially complete

## Labels

type:task, area:identity, area:infra, status:blocked, priority:p1

## Assignees

edcalderon
