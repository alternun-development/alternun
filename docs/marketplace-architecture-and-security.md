# Marketplace architecture and security

This note explains how the marketplace (epic [#249](https://github.com/alternun-development/alternun/issues/249)) is built and which rules keep it safe. It is for engineers who change the marketplace API, database, admin panel or Explorer. For who can do what, see [marketplace-admin-roles.md](marketplace-admin-roles.md). For User Airs Reports, see [airs-user-reports-and-claiming.md](airs-user-reports-and-claiming.md).

## Components

| Part        | Where                                                                | Role                                                                                                                                    |
| ----------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer    | `apps/mobile/app/explorar.tsx`, `apps/mobile/app/explorar/*`         | Public listing and detail of published projects and active enterprises. Reads only the public API.                                      |
| Admin panel | `apps/admin/src/pages/marketplace/*`, `apps/admin/src/marketplace/*` | Alternun Admin screens for enterprises, projects, media, activities, team, comments, audit and Airs reports.                            |
| API         | `apps/api/src/modules/marketplace/*`                                 | NestJS on Fastify. Public routes under `/v1/projects`, `/v1/enterprises` and `/v1/project-proposals`; admin routes under `/v1/admin/*`. |
| Database    | `supabase/migrations/20261013_*` and later                           | Postgres tables, security-definer functions for every sensitive change, and the admin audit log.                                        |

Explorer and the panel never talk to the database. Every read and write goes through the API.

## Data model

- `enterprises` and `projects`, joined by `enterprise_projects` (`relation` and one `is_primary` owner per project).
- `project_media` (logo, cover, gallery image, video, Canva) and `project_media_allowed_hosts` (allowed hosts per media kind).
- `project_memberships`: scoped roles (`partner_operator`, `sub_admin`, `partner_readonly`) on an enterprise or a project.
- `project_activities`, `project_activity_completions` and `project_participants`. Approved completions write to `airs_ledger_entries`.
- `project_comments`, `project_proposals` and `project_proposal_ip_submissions`.
- `airs_reports`, `airs_report_rewards`, `airs_report_approvers` and `airs_report_settings` (User Airs Reports).
- `admin_audit_log`: every allowed sensitive change and every denied attempt.

## How a request is authorized

Each admin request passes four checks. Each check is enforced on the server; the panel only hides or disables controls.

1. **Token.** `MarketplaceAdminGuard` accepts only a bearer token with a valid signature from the configured issuer, the expected audience, and valid time claims. Roles come from the token's role and group claims (`apps/api/src/common/admin-auth/admin-auth.guard.ts`).
2. **Permission.** Each route declares a permission with `@RequireMarketplacePermission`. The role-to-permission map lives in `admin-auth.guard.ts`. The panel keeps a mirror in `apps/admin/src/marketplace/permissions.ts`, and `apps/admin/test/marketplace-permissions.test.mjs` fails if the two differ.
3. **Scope.** Scoped roles act only where they hold an active membership. The service asks `marketplace_actor_has_scope`, which checks the membership and that the project is related to the enterprise. **Any `enterprise_projects` row counts as a relation, primary or not**, so an enterprise-level membership reaches every project related to that enterprise.
4. **Database function.** Status changes, completion approval and reversal, media reorder, participants, memberships and Airs reports go through `security definer` functions. Each one checks the actor's roles and scope again and writes the audit row in the same transaction. A bug in the API layer cannot skip these checks.

Denied attempts return a stable error code (`marketplace.errors.ts`) and are written to `admin_audit_log` with `result = 'denied'` and the reason code.

## Database rules

- **Row level security is on and deny-all** for every marketplace table. There are no policies for `anon` or `authenticated`. The API connects with the `service_role` key, server-side only.
- **Functions:** `security definer`, `set search_path = pg_catalog, public`, `EXECUTE` revoked from `public`, `anon` and `authenticated`, and granted only to `service_role`. Inputs are validated so that `NULL` never passes a check.
- **Migrations are additive.** New behavior gets a new dated migration; an applied migration is never edited. Data fixes run through the same audited functions the API uses, so they leave an audit trail.
- **Idempotency.** Ledger entries use deterministic idempotency keys, and Airs report submissions use a client request key, so a retry never credits twice.

## Content and media

- Project content is localized JSON (`es`, `en`, `th`) validated by the API: the default language must be present, and field lengths are capped.
- Media URLs must be `https` and their host must be in `project_media_allowed_hosts` for that media kind. The API and the database both check this.
- Only global admins and the project's `partner_operator` change brand media (logo and cover).
- Public responses expose only published projects of active enterprises, and never internal fields such as creator identity or legal name.

## Abuse controls

- Public project proposals are rate limited by a keyed hash (HMAC) of the client IP; the raw IP is not stored.
- The Airs report recipient lookup is exact-email only, rate limited and audited.
- User Airs Reports snapshot their payload with a hash. Approval binds to that hash, a trigger blocks changes after submit, and approvers come from an allowlist checked inside the database function.

## Pilot data

`20261013_0001` seeded a local placeholder enterprise, "Hotel Piloto", that owned `eco-turismo`. `20261018_0001` made the `alternun` enterprise the primary owner of `eco-turismo` and kept the old relation as non-primary. Hotel Piloto has no project of its own and is being archived by an audited migration (issue #249, A4). Its non-primary relation to `eco-turismo` is kept for the record; because of rule 3 above, nobody should get an enterprise membership on Hotel Piloto.

## OpenAPI

The API builds its OpenAPI document at startup (`apps/api/src/common/openapi/setup-openapi.ts`) and serves it at `GET /docs-json` (Swagger UI at `/docs`). No snapshot is committed, because building the full document needs the whole `AppModule`, and starting the API also runs pending migrations against the configured database.

To export the document:

```bash
# From a running local API (pnpm --filter @alternun/api dev) pointed at a local database
curl -fsS http://localhost:8082/docs-json -o openapi.json

# Or from a deployed environment, read-only
curl -fsS https://testnet.api.alternun.co/docs-json -o openapi.json
```

Do not commit the exported file unless the team decides to version it; it changes with every release.

## Checklist for a new marketplace endpoint

- Declare the permission with `@RequireMarketplacePermission`, and pass `'enterprise'` or `'project'` when the route acts on one.
- Authorize again in the service with the target's enterprise and project ids, so scope is checked.
- Put sensitive writes in a `security definer` function with the rules above, and audit both allowed and denied results.
- Add the permission to the panel mirror and to the matrix test.
- Write a positive and a negative test per role, and check that the test fails when the authorization line is removed.
- Add OpenAPI decorators (`@ApiOperation`, `@ApiOkResponse`, error responses) like the neighboring routes.
