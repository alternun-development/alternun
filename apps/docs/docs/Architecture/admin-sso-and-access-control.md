---
sidebar_position: 2.6
---

# Admin SSO and Access Control

This describes the current, intended architecture for admin login (`admin.alternun.co`), as distinct from the AIRS mobile/web consumer login covered in [Authentication and Session Flow](./authentication-and-session-flow). Both share the same Authentik instance, but the admin path uses a different flow shape and its own access-control gate.

## Outer-Flow Source Stage

Admin login goes through a custom **outer-flow SourceStage** on top of stock Authentik, rather than a direct source login:

1. `SourceStageView` suspends the current (admin) flow execution, saves it as a pickled `FlowPlan` on a `FlowToken`, and redirects the browser into the chosen source (e.g. Google).
2. The source's own authentication/enrollment flow runs as normal, with a dynamic in-memory `SourceStageFinal` stage injected at the end.
3. `SourceStageFinal` restores the original suspended admin flow from the `FlowToken` and resumes it, completing the handoff back to `admin.alternun.co`.

This lets the admin app sit behind a normal social login while keeping the admin flow itself in full control of what happens after the identity provider returns. It is implemented as a runtime patch applied to the identity container on every deploy — see `packages/infra/scripts/templates/deploy-authentik.sh` — not as stock Authentik behavior.

## Access Control

Reaching `admin.alternun.co` requires two things, in order:

1. **Authentication** — any user who can complete the outer-flow source login (e.g. via Google) reaches this point.
2. **Authorization** — the `alternun-admin` Authentik application is gated by an expression policy, `alternun-admin-access`, that only allows users who belong to `Alternun Dashboard Admins` or `authentik Admins`.

A successful login does **not** imply admin access. A new admin must be added to one of those two groups explicitly; this is a deliberate authorization step, not something the identity bootstrap automates.

## Operational Notes

- The outer-flow hotfix and the `alternun-admin-access` policy are both required, load-bearing parts of this path — they are not legacy code to be cleaned up.
- If admin login loops indefinitely, suspect the outer-flow hotfix ordering (redirect must happen before session cleanup).
- If a real admin sees "Permission denied" after a successful login, add them to `Alternun Dashboard Admins`.
- Full incident history and root causes: `docs/alternun-authentik-admin-sso-incident-2026-08.md` in the repo root.
