---
sidebar_position: 1
---

# Contribution Overview

This section explains how engineering work is proposed, tracked, and delivered in the Alternun monorepo.

It is written for:

- new contributors who need a clear path from idea to merged change
- maintainers who want consistent issue structure and status updates
- reviewers who need to understand how work is split across epics, tasks, and pull requests

## Contribution Principles

The project uses a few simple operating rules:

1. **Track work before implementing it.** Significant changes should start from a GitHub issue, not from an untracked branch.
2. **Split strategy from execution.** Multi-step efforts should use an epic issue with linked child issues.
3. **Keep acceptance criteria explicit.** Every issue should say what done means.
4. **Use labels as metadata, not decoration.** Labels should answer what kind of work this is, what area it belongs to, how urgent it is, and whether it is blocked or in progress.
5. **Close with evidence.** Issues should be closed only when their acceptance criteria are actually satisfied.

## Standard Work Shape

Most work should follow this path:

1. Open or confirm the GitHub issue.
2. Label it by type, area, status, and priority.
3. Add scope, deliverables, dependencies, and acceptance criteria.
4. Link the implementation PR to the issue.
5. Update status comments as meaningful milestones land.
6. Close the issue only when validation is complete.

## Issue Types

Alternun currently uses these issue types:

- `type:epic` for parent issues that coordinate multiple child issues
- `type:feature` for product or platform behavior changes
- `type:spec` for contracts, schemas, or design-definition work
- `type:task` for focused implementation or operational work

## Area Labels

Area labels help route work to the right subsystem:

- `area:identity`
- `area:infra`
- `area:backend`
- `area:api`
- `area:data`
- `area:wallet`
- `area:blockchain`
- `area:admin`

## Status And Priority

Status labels describe the current state:

- `status:planned`
- `status:in-progress`
- `status:needs-validation`
- `status:blocked`

Priority labels describe urgency:

- `priority:p0` for critical-path or launch-blocking work
- `priority:p1` for important near-term work
- `priority:p2` for useful follow-up work

## What To Read Next

To work inside the backlog correctly:

1. Read [Issue Tracking And Labels](./issue-tracking-and-labels.md)
2. Then review the relevant architecture and delivery docs before implementation

When work changes repo structure or contracts, update the documentation in the same pull request whenever practical.
