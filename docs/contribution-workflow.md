# Alternun Contribution And Issue Workflow

## Purpose

This document is the internal operating reference for how Alternun maintainers structure backlog work in GitHub and keep the Docusaurus contribution docs aligned with actual repo practice.

Use it when:

- triaging new work
- turning design notes into implementation issues
- creating or maintaining epic issues
- deciding when an issue is ready to close

The public contributor-facing summary lives in:

- `apps/docs/docs/Contribution/overview.md`
- `apps/docs/docs/Contribution/issue-tracking-and-labels.md`

## Canonical Label Set

### Type

- `type:epic`
- `type:feature`
- `type:spec`
- `type:task`

### Area

- `area:identity`
- `area:infra`
- `area:backend`
- `area:api`
- `area:data`
- `area:wallet`
- `area:blockchain`
- `area:admin`

### Status

- `status:planned`
- `status:in-progress`
- `status:needs-validation`
- `status:blocked`

### Priority

- `priority:p0`
- `priority:p1`
- `priority:p2`

## Required Body Shape

For non-trivial issues, use this shape:

1. Summary
2. Scope
3. Deliverables
4. Acceptance Criteria
5. Dependencies
6. References

This is the minimum structure that keeps issues reviewable across infra, backend, wallet, and blockchain tracks.

## Epic Rules

Use an epic when the work:

- spans multiple subsystems
- has multiple execution stages
- needs explicit child issue ordering
- should not be closed when the first PR merges

Every epic should:

- carry the main objective
- list child issues in execution order
- describe what remains open
- be updated when child issues close or move to validation-only state

## Status Rules

Apply statuses consistently:

- `status:planned` when the issue is defined but not started
- `status:in-progress` when active implementation or active ops work is underway
- `status:needs-validation` when substantial implementation exists but the acceptance evidence is still incomplete
- `status:blocked` when the next step depends on an external decision, access, or unresolved prerequisite

Closed issues do not need an open-status label unless there is a reporting reason to preserve one.

## Closure Rules

Do not close an issue only because code landed.

Close it when:

- its acceptance criteria are satisfied
- any required validation has been performed
- dependent epics or tracking comments have been updated

If implementation landed but validation is still missing, keep the issue open and use `status:needs-validation`.

## Documentation Sync Rule

When the maintainer workflow changes:

1. update this file
2. update the Docusaurus contribution section
3. if the label taxonomy changed, update the existing GitHub labels to match

Do not let the docs diverge from the actual GitHub issue structure.
