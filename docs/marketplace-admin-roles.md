# Marketplace admin roles and Authentik groups

This page explains who can do what in the marketplace admin console (Alternun Admin) and how to give each role to a person. Permissions are always enforced by the API. The admin console only hides or disables controls.

## Roles

Each admin role has exactly one Authentik group. A group that is not in this table grants no admin role, even if its name looks similar.

| Role                                          | Authentik group              | Scope                          | Can do                                                                                                                                                                                                                                                                                                                                                   | Cannot do                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform_owner` (Super Admin)                | `Alternun Platform Owner`    | Global                         | Everything in the marketplace: enterprises, projects, publication status, media, activities, memberships, comments, audit, and reversing awarded points.                                                                                                                                                                                                 | —                                                                                                                                                                                                                                                                    |
| `internal_admin`                              | `Alternun Internal Admin`    | Global                         | Same as `platform_owner`, except reversing awarded points and transferring projects.                                                                                                                                                                                                                                                                     | Reverse awarded points; transfer projects.                                                                                                                                                                                                                           |
| `moderator`                                   | `Alternun Moderator`         | Global                         | Edit project copy (content only); moderate comments; retire gallery, video, and Canva media; read projects, media, memberships, activities, completions, and audit history.                                                                                                                                                                              | **Approve, reject, or record activity completions, award points, or pause activities.** Also: change project identity fields, the logo, or the cover image; reorder media; create or edit activities; manage memberships or participants; change publication status. |
| `partner_operator` (Enterprise/Project Admin) | `Alternun Partner Operator`  | Assigned enterprise or project | Create draft projects (enterprise scope); edit project fields and copy; manage all media, including the logo and cover image; create, edit, and publish activities; record, approve, and reject completions; manage participants; give or remove `sub_admin` and `partner_readonly`; read audit history; edit the enterprise name, country, and website. | Publish, pause, resume, or archive projects; reverse awarded points; give `partner_operator` or any global role; change the enterprise legal name; act outside the assigned scope.                                                                                   |
| `sub_admin` (Project Sub-admin/Moderator)     | `Alternun Sub Admin`         | Assigned project               | Edit project copy; add, edit, reorder, and retire gallery, video, and Canva media; edit activity copy; pause a published activity; record and reject completions; manage participants; moderate comments.                                                                                                                                                | **Approve completions or award points.** Also: change the logo or cover image; change activity rules; manage memberships; act outside the assigned project.                                                                                                          |
| `partner_readonly`                            | `Alternun Partner Read Only` | Assigned enterprise or project | Read the assigned enterprise or project.                                                                                                                                                                                                                                                                                                                 | Any change.                                                                                                                                                                                                                                                          |

The groups `authentik Admins` and `Alternun Dashboard Admins` remain supported aliases for `platform_owner` and `internal_admin`.

## Field rules

- **Project.** `moderator` and `sub_admin` may change only the localized copy (`content`). Changing the slug, category, country, time zone, or default language is denied with `PROTECTED_FIELD_WRITE_DENIED`. The slug cannot change after the first publication, for any role.
- **Brand media.** Only `platform_owner`, `internal_admin`, and a `partner_operator` with a membership on that project may create, edit, or retire `logo` and `cover` media. Anyone else is denied with `BRAND_ASSET_WRITE_DENIED`. Gallery images, video, and Canva links follow the normal media permissions.
- **Enterprise.** Only `platform_owner` and `internal_admin` may change the legal name.
- **Activities.** `sub_admin` may change only the activity copy and default language. Points, recurrence, and limits are protected.
- **Points.** Approving a completion awards the activity's configured points through the ledger, and the approver never chooses the amount. Only `platform_owner`, `internal_admin`, and a `partner_operator` with a membership on the project can approve. **`sub_admin` and `moderator` never approve completions or award points**; the API and the database both deny it. Only `platform_owner` can reverse awarded points.
- **Activity status.** Publishing an activity requires `platform_owner`, `internal_admin`, or `partner_operator`. Pausing a published activity is also open to `sub_admin` on its project. **`moderator` cannot pause or publish activities.**

Every denied attempt is recorded in the admin audit log.

## How to give a role

### Global roles: `platform_owner`, `internal_admin`, `moderator`

1. In Authentik, add the person to the role's group.
2. The person signs in to Alternun Admin again, which issues a new token that includes the role.

To remove the role, take the person out of the group. The change applies when the person's current token expires or when they sign in again.

### Scoped roles: `partner_operator`, `sub_admin`, `partner_readonly`

A scoped role needs **both** of the following. If either one is missing, the API denies access.

1. **The group.** In Authentik, add the person to the role's group. This lets the person sign in to Alternun Admin and puts the role in their token.
2. **The membership.** In Alternun Admin, open the project, go to **Team**, and add the person with the same role. The person identifier is the person's Authentik user ID (UUID), shown on the user's page in Authentik. `platform_owner` and `internal_admin` can give any scoped role. A `partner_operator` can give `sub_admin` and `partner_readonly` only within their own scope.

To remove a scoped role, revoke the membership in **Team**. Also remove the group if the person has no other membership that needs it. Nobody can change or revoke their own membership.

## Acceptance flow: assigning the hotel team

**Step 2: the Super Admin assigns the hotel Project Admin.**

1. In Authentik, add the hotel administrator to `Alternun Partner Operator`.
2. Signed in as `platform_owner`, open the hotel project in Alternun Admin. Go to **Team** and add the administrator's Authentik user ID with the role `partner_operator`.
3. The hotel administrator signs in to Alternun Admin and sees only the hotel project. **Team** grants project-scope memberships; an enterprise-scope membership, which is needed to create new projects for the enterprise, is not yet available from the console.

**Step 4: the Project Admin adds a scoped sub-admin.**

1. In Authentik, add the sub-admin to `Alternun Sub Admin`. This step is done by whoever administers Authentik; a `partner_operator` cannot change Authentik groups.
2. Signed in as the hotel `partner_operator`, open the hotel project. Go to **Team** and add the sub-admin's Authentik user ID with the role `sub_admin`.
3. The sub-admin signs in. They can edit copy and gallery media, moderate comments, and support participants in that project only. They cannot change the logo or cover image, and they cannot approve completions or award points.

## Planned: User Airs Reports

Epic #249 adds a User Airs Report that `partner_operator` and `sub_admin` can submit for their project. A report is not an award: nothing is credited until the report is auto-approved within the per-recipient limits or approved by an allowlisted Grant Approver. The rules above for completions and points do not change. Scoped roles are assigned by email instead of the Authentik user ID, and accounts on `@alternun.co` are treated like `@alternun.io` ones: the bootstrap makes them `internal_admin` only when the person signed in through a source such as Google (which proves they own the address); an address that merely ends in the domain is skipped and reported as `skipped_unverified`. `platform_owner` is still assigned by hand. See [airs-user-reports-and-claiming.md](airs-user-reports-and-claiming.md).

## After merging changes to the group map

The groups, the Alternun Admin access policy, and the `alternun_roles` claim are created or updated by `packages/infra/scripts/templates/bootstrap-authentik-integrations.py`. After any change to its group map is merged, whoever administers Authentik must run the bootstrap script again in **each** environment. Until then, the new groups do not exist there, and their members cannot sign in to Alternun Admin. The script creates missing groups and leaves existing groups and their members unchanged.
