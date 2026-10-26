# User Airs Reports and Airs claiming

This page describes how project admins and moderators grant Airs to people from the admin console (Alternun Admin), and how a person claims Airs that were granted before they had an account. It is the working spec for epic [#249](https://github.com/alternun-development/alternun/issues/249), Part B. Update it as each phase lands.

**Status (2026-10-26): specified, not built.** The decisions below are agreed. No code, migration or admin screen for User Airs Reports exists yet. The [current platform](#current-platform) section describes what works today.

## Current platform

What exists today and what this process builds on:

- **Activity awards.** A project admin records an activity completion and approves it. The approval writes the activity's configured amount to `airs_ledger_entries` (`source_kind = validated_regenerative_action`) with an idempotency key. The approver never chooses the amount. See `marketplace_approve_activity_completion` in `supabase/migrations/20261013_0003_*`.
- **Participants need an account.** `marketplace_add_project_participant` takes an email and returns `USER_NOT_FOUND` when no account exists. There are no pending users, invitations or claimable grants.
- **Scoped roles need the Authentik user ID.** A project membership is keyed by the Authentik UUID, and the matching Authentik group is added by hand. See [marketplace-admin-roles.md](marketplace-admin-roles.md).
- **Domain admins.** Bootstrap maps `edward@alternun.io` to `platform_owner` and any active `@alternun.io` user to `internal_admin`, which can edit every project. `@alternun.co` is not mapped yet. See `packages/infra/modules/identity-resources.ts`.
- **Achievements.** `user_achievements` and `get_user_achievements` use a fixed catalog. There are no custom medals per project.
- **Notifications.** A ledger trigger sends the in-app `airs_credited` event for any positive ledger entry. Email goes through the SMTP sender in `apps/api/src/modules/airs/airs.email.ts`. See [notifications.md](notifications.md).

## Who takes part

| Actor                              | How they get access                                                        | In this process                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Alternun Super Admin               | Verified `@alternun.io` or `@alternun.co` account                          | Edits every project. Assigns Project Admins. Manages the project type and medal catalogs. Can submit reports on any project. |
| Grant Approver                     | Allowlist: `edward@alternun.io`, `admin@alternun.co`, `sgomez@alternun.io` | Reviews reports over the auto-approval limits. Being on an Alternun domain is not enough.                                    |
| Project Admin (`partner_operator`) | Assigned by a Super Admin                                                  | Submits reports for their project. Assigns Project Moderators.                                                               |
| Project Moderator (`sub_admin`)    | Assigned by a Super Admin or the Project Admin                             | Submits reports for their project.                                                                                           |
| Project account                    | One real Airs account per project, for example `ecoturismo@alternun.co`    | Receives the project reward.                                                                                                 |
| Support                            | `support@alternun.io`, `support@alternun.co`                               | Gets in-app and email notice of every report.                                                                                |

A User Airs Report is separate from activity completions. Today, `sub_admin` and `moderator` cannot approve completions or award points. Submitting a report does not change that: a report credits nothing until it is approved (B.4 in the issue).

## The report form

Opened from a project's admin view.

| Field               | Rule                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recipient email     | Search by email over existing Airs users. Any valid email is accepted.                                                                                                 |
| Name                | Required when the email has no account.                                                                                                                                |
| Airs amount         | Positive integer. No cap per report.                                                                                                                                   |
| Concept             | Required text explaining why the Airs are granted.                                                                                                                     |
| Medal               | Optional. Chosen from the project's own medal catalog.                                                                                                                 |
| Supporting document | Document number, for example the invoice number, plus an optional file. The number is required when the project type requires it (initially hotel and basic commerce). |

If the email has no account, the system creates a pending user for it. The account is left open for that person.

## States

```
draft ──submit──┬─(within limits)──▶ auto_approved ──▶ approved ──┬─(recipient exists)──▶ released
   │            └─(over limits)──▶ pending_approval ──approve──▶ approved   └─(new user)─▶ awaiting_claim ──claim──▶ released
   └─cancel─▶ cancelled ◀──cancel──┘        └─reject──▶ rejected
released ──reverse (platform_owner only)──▶ reversed
```

- **Auto-approval.** A report is approved automatically when the recipient stays within **100 Airs per day and 300 Airs per month**, counting every report to that recipient across all projects and including this one. Otherwise the whole report waits in `pending_approval` until a Grant Approver reviews that recipient's transactions. Days and months follow `America/Bogota`. The check runs in the database, inside the same transaction as the state change, with a lock per recipient.
- **No self-approval.** Nobody approves a report they submitted.
- **Frozen after submit.** The payload (recipient, name, amount, concept, medal, document, project, submitter) is snapshotted and hashed. Approval binds to that hash, and a trigger rejects updates. To change a report, cancel it and submit a new one.

## Claiming

Airs do not expire, so a report in `awaiting_claim` stays claimable indefinitely. Only a Super Admin can cancel it before the claim.

1. The person signs in for the first time, with any provider.
2. The system matches the **confirmed** email of the session to the pending user's normalized email. An unconfirmed or different email claims nothing.
3. In one transaction: the pending user is linked to the account, the recipient is credited, and the medal is awarded.
4. The rewards are created (next section).

Nothing tied to a new-user report is credited before step 3. Retried sign-ins or webhooks cannot credit twice because every ledger write uses a deterministic key:

- `airs-report:<id>:recipient`
- `airs-report:<id>:issuer-reward`
- `airs-report:<id>:project-reward`

A recipient who already has an account is credited as soon as the report is approved. That path has no claim step and no rewards.

## Rewards for submitters and projects

For each **new user who registers and claims**, the submitter gets **+5 Airs** and the project account gets **+5 Airs**. There is no limit on how many new users an actor can bring.

- Both rewards are created as `locked` at the claim.
- They are credited once the new user holds **at least 20 paid Airs**. The claimed grant counts, so a claim of 20 or more paid Airs unlocks them at once.
- **Paid Airs** are Airs issued from a commercial relationship with a client, which generate income for a project and for the RBI fund. Referral, profile and other bonus rewards do not count.
- If the report is reversed before that, the rewards become `void`.

Locking the rewards behind paid Airs removes the incentive to register fake emails.

## Project types

Each project has a commerce type, separate from its impact category (`project_categories`). Alternun defines an initial set (proposal: hotel, restaurant, café, retail store, tourism operator, events and sports, other). Super Admins add, rename or retire types in the Super Admin view of admin.alternun.co. Each type has a flag that says whether the document number is required.

## Medals

Medals are custom per client and project, for example a golf tournament or a race, and are designed by the Alternun design team. Super Admins upload them to a project. A project's admins and moderators can only pick that project's medals.

## Notifications

| Event                    | In-app                     | Email                                                                                                                         |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Submitted, auto-approved | Support                    | Support (tracking)                                                                                                            |
| Submitted, over limits   | Approvers, support         | Approvers, support                                                                                                            |
| Approved or rejected     | Submitter                  | Submitter, support                                                                                                            |
| Released                 | Recipient, submitter       | Recipient (congratulations, with amount, concept, project, medal and a link to open the account); support (issuance tracking) |
| Rewards unlocked         | Submitter, project account | Submitter                                                                                                                     |

Email delivery is tracked apart from the report state. A failed email never blocks or undoes a release. Every email template passes the Airs language guardrail.

## Still open

- Confirm the approver mailboxes `admin@alternun.co` and `sgomez@alternun.io`.
- Decide whether domain Super Admins are `platform_owner` or stay `internal_admin`.
- **Deferred:** limits per submitter or per project. Today's limits are per recipient only. Revisit together with monitoring for many small grants spread across many recipients.
