# Task Specifications

`.specs/` is Alternun's canonical, repository-local home for implementation task specifications. It is a project convention, not a directory imposed by OpenSpec or by `@edcalderon/versioning`.

`@edcalderon/versioning` remains responsible for version, changelog, and release workflows. OpenSpec is not configured in this repository. Do not introduce either as a second task-spec system without an explicit migration decision.

## Lifecycle

Create one task file in `tasks/draft/` and move that same file through the lifecycle:

```text
draft -> todo -> in-progress -> done
```

- `draft`: the initial request has been captured but not refined.
- `todo`: the task is specified and ready to schedule.
- `in-progress`: active implementation or validation is underway.
- `done`: acceptance criteria and required evidence are complete.

Do not copy a task between folders or maintain a duplicate in `.agents/`; move the single canonical file instead.

## Required Links

For non-trivial work, the task frontmatter should include the issue, owner, priority, area, dependencies, and intended release where known. GitHub Issues are the delivery-tracking record; link the issue from the spec and link the canonical spec from the issue or PR. Release notes and versions remain managed by the versioning workflow, so link a release rather than duplicating release state in another task system.

Keep task-specific technical evidence in `analysis/` and temporary discovery notes in `scratchpad/`. Durable architecture decisions belong in `docs/`, not in a task scratchpad.

## Legacy Migration

The historical `.agents/*-tasks` workflow is archived under `.agents/archive/task-workflow/`. Its active and pending task bodies were moved into this directory's canonical lifecycle. See [MIGRATION-INDEX.md](./MIGRATION-INDEX.md) for the one-way mapping; the archive is reference history, not an alternative backlog.
