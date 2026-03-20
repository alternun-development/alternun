---
sidebar_position: 2
---

# Issue Tracking And Labels

Alternun now uses a simple issue workflow so roadmap items, implementation work, and validation gaps are visible in GitHub without relying on memory.

## Required Issue Shape

For meaningful work, issues should include:

- summary
- scope
- deliverables
- acceptance criteria
- dependencies
- references to relevant docs or specs

That structure keeps planning readable and makes review easier when work spans backend, infrastructure, and blockchain concerns.

## Parent And Child Flow

Use an epic when work is too large for one issue.

Good epic behavior:

- defines the larger objective
- lists child issues in execution order
- keeps cross-cutting dependencies visible
- stays open until the remaining child issues and epic acceptance criteria are satisfied

Good child issue behavior:

- owns one coherent slice of delivery
- declares dependencies explicitly
- can be closed independently once its own acceptance criteria are met

## Label Taxonomy

Every significant issue should usually have:

- one `type:*` label
- one or more `area:*` labels
- one `status:*` label while it is open
- one `priority:*` label

### Type Labels

- `type:epic`: parent tracker for a delivery stream
- `type:feature`: implementation of a new capability or behavior
- `type:spec`: design, schema, contract, or interface definition
- `type:task`: focused operational or implementation work

### Area Labels

- `area:identity`: Authentik, auth flows, JWTs, and identity contracts
- `area:infra`: deployment, DNS, TLS, runtime, secrets, and operations
- `area:backend`: API services, workers, and server-side logic
- `area:api`: REST and OpenAPI contracts
- `area:data`: schemas, migrations, persistence, and ownership boundaries
- `area:wallet`: wallet registration, linking, provisioning, and custody
- `area:blockchain`: contracts, chain events, and token flows
- `area:admin`: internal operator and admin surfaces

### Status Labels

- `status:planned`: defined and queued
- `status:in-progress`: actively being worked
- `status:needs-validation`: implementation exists but proof is still missing
- `status:blocked`: cannot advance until an external dependency or decision is resolved

### Priority Labels

- `priority:p0`: launch-blocking or critical path
- `priority:p1`: important near-term work
- `priority:p2`: follow-up work after current priorities

## Recommended Lifecycle

### 1. Triage

When a new issue is opened:

- decide whether it is an epic, feature, spec, or task
- add the subsystem area labels
- assign initial status and priority
- reject or split issues that combine too many unrelated concerns

### 2. Planning

Before implementation:

- add acceptance criteria
- add dependencies
- split oversized work into child issues if needed
- link the issue to the PR once implementation starts

### 3. Execution

While work is active:

- keep `status:in-progress` current
- add progress comments when meaningful milestones land
- move to `status:needs-validation` when code exists but evidence is incomplete

### 4. Closure

Before closing an issue:

- verify the acceptance criteria are satisfied
- update the parent epic checklist or status comment if applicable
- close follow-up gaps as separate issues instead of leaving them implicit

## When To Open A Follow-Up Issue

Open a follow-up issue when:

- an implementation lands but validation is still missing
- a spec is clear enough to split into implementation work
- a merged PR reveals a separate operational or product task
- an epic has mixed concerns that should be tracked independently

## Documentation Rule

If a change alters:

- architecture
- delivery flow
- contracts or schemas
- contributor workflow

then update the relevant docs in the same change whenever possible.

For maintainer-specific operating notes, see the internal repo doc at `docs/contribution-workflow.md`.
