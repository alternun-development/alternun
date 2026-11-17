---
name: testnet-review-2026-11-15
title: Fixes from the 15-Nov-2026 testnet review (manage, Airs approval, admin panel, explorer)
priority: p0
status: in-progress
owner: edcalderon
area: [mobile, api, admin, infra]
created: 2026-11-17
issue: https://github.com/alternun-development/alternun/issues/315
release: next patch after v1.2.6 (PR #313)
depends_on: []
---

# Fixes from the 15-Nov-2026 testnet review

Source: internal testnet review of 15-Nov-2026 (global admin session, desktop 1366×633). The review
document stays internal; this spec tracks what has to change in code. Screenshot numbers (NN) refer
to that document.

Legend: `[x]` done and committed, `[~]` code done but needs a deploy, config or decision, `[ ]` todo.

## 0. Blockers

- [~] **Admin panel says "Your session has expired" on every section** (34, 35): fixed, pending deploy.
  - [x] API guard required the optional `nbf` claim, which Authentik never sets (commit `917db6e1`).
  - [x] API Lambda got the app's issuer/audience and a non-existent JWKS path for `ADMIN_AUTH_*`;
        now derived from the `alternun-admin` provider (commit `045ae688`). Takes effect after the next
        testnet deploy.
- [x] **Approval email links to the app instead of the admin panel** (32); now
      `<admin>/airs-reports?report=<id>` and the queue opens that report (commit `89eff5c7`).
- [x] **Nobody may approve their own Airs**: recipient and submitter excluded from the review
      email/inbox and refused on approve/reject (commit `89eff5c7`).
- [x] **Enterprise "Add client" search does nothing** (11): enterprise client listing only
      included owned projects; allied enterprises (linked projects) had none (commit `2a6152b3`).
- [x] **"View file" shows an empty viewer** (28): Lambda returned binary bodies as UTF-8; now
      base64 (commit `2a6152b3`). Follow-up below for files > ~4.4 MB.
- [x] Web console `Cannot use 'import.meta' outside a module` (common chunk) (commit `2a6152b3`).

## 1. Security findings on PR #313 (CodeQL)

State on 2026-11-17 (analysis of `develop`):

- [x] #76, #77 Polynomial ReDoS in honor-award email check → linear-time check (`0f0a8cba`); closed.
- [~] #74 CORS header traced from the request origin. First fix (`0f0a8cba`) was not recognized;
  now the origin is returned only inside an `allowlist.includes(origin)` check (`837524bb`).
  Waiting for the next CodeQL run on `develop`.
- [~] #75 Missing rate limiting on the email sign-in hook → `@fastify/rate-limit` on that route
  only (10/min per client IP) in front of Better Auth's own limits (`1214da87`). Waiting for the next CodeQL run on `develop`.
- [x] #67 Shell command built from an absolute path (infra test) → path passed via env
      (`0f0a8cba`); stays open on `master` until the release merges.
- [ ] The PR's "CodeQL" check compares against a stale merge analysis (2026-11-14): GitHub cannot
      build `refs/pull/313/merge` while the PR conflicts with `master` (see §8c). It turns green
      once `master` is synced.

## 2. Airs approval flow

Rule (owner decision 2026-11-17): **any Airs an admin assigns to their own account always need
another admin's approval** — never auto-approved, never self-approved.

- [x] Airs reports: a report to the submitter's own account is never auto-approved
      (`SELF_REPORT`, DB) and its submitter/recipient cannot approve or reject it (DB + API,
      `89eff5c7`); the review email and client notice now say it is a self-assignment instead of
      "over the automatic limits" (`d19392e1`). The 40-Airs test report went to review for this
      reason, not because of the limits.
- [x] Activity completions: an admin could award their own completion (writes Airs). The API now
      refuses it by app session, console identity, account or email (`d19392e1`).

- [x] In-app screen for "In review" Airs: route `/airs-reports` (also rescues old email links,
      `?report=<id>` opens that report), list with proof, recipient totals, approve/reject with
      reason; Explorer header entry for approvers only; API `me/airs-reports` with the Airs session,
      same approver table and self-approval refusal (`55dc5974`, `de0ea137`, `f5abeb00`).
      Approvers read proof files only while the report is in review (`e204e1fc`).
- [ ] Review email: a real button, not a plain-text link; consider linking to the app's
      `/airs-reports` now that approval exists there.
- [ ] No notification arrived for a new 40-Airs assignment.
- [ ] Automatic-approval threshold: the 40-Airs case was a self-assignment, not the limit. Still
      confirm the daily/monthly limits and whether they should be configurable per project/enterprise
      (**decision**).
- [ ] Proof files above ~4.4 MB will hit the 6 MB Lambda response limit once base64-encoded;
      serve them through a short-lived signed URL.

## 3. Enterprises and projects from the app

- [ ] Global admin can create/approve enterprises and projects and link them, in the app.
- [ ] Public "Enroll my company" form: "cause or project" is free text; offer the published
      projects so the relationship is created (06).
- [ ] Application gets a reference number and says whether a confirmation email is sent;
      "Send application" disabled after sending.

## 4. Manage views: feedback and lists that refresh

- [x] "Save changes" in Information shows a confirmation (14). (commit `bf4a1fb0`)
- [x] Client list refreshes after "Client added" (17, 18). (commit `bf4a1fb0`)
- [x] "Assign Airs" opens in the client's row and its button says "Assign Airs", not
      "Add client" (26); success toast title matches the action (27). (commit `bf4a1fb0`)
- [x] Removing a team member asks for confirmation. (commit `bf4a1fb0`)
- [x] Comments: one reason field per comment; the missing-reason error must not shift the
      buttons (20); a hidden comment shows its reason. (commit `a82f3248`)
- [ ] Team: change a member's role in place; warn when adding a global admin as moderator.
- [ ] Enterprise Team tab: contradictory intro texts; roles still named "Project admin/moderator".
- [ ] Awards tab: explain how honor awards are given (30).
- [ ] Products and Airs: mark a scale as "proposed" or "current" (31).
- [x] Light mode cards/fields and contrast in manage and explore (commit `7ce8a7b4`).
- [x] Project content per language (ES/EN) with English fallback (commit `0bd4fceb`).

## 5. Public project page

- [ ] Real gallery (grid/carousel with enlarged view) instead of one 260×180 thumbnail (25).
- [ ] La Matilde has no banner (content, not code).
- [x] "Earn Airs with the project's allies" looks like a button but does nothing; show the allies. (commit `2c4dd654`)
- [x] Hide placeholder values ("POR CONFIRMAR") and internal statuses. (commit `2c4dd654`)

## 6. Explorer and copy

- [x] "Enterprises creating impact" → "Empresas donde sumas Airs" (+ English equivalent) (04). (commit `2c4dd654`)
- [x] City instead of country code "CO" (04, 10). (commit `2c4dd654`)
- [x] Plural: "1 published projects" (04, 10). (commit `2c4dd654`)
- [ ] Featured project chosen by an admin instead of rotating (it showed a test photo).
- [ ] Remaining English/Spanish mix and "puntos" wording.
- [x] Empty green carousel block above the enterprise form (05). (commit `2c4dd654`)

## 7. Dark-mode visual redesign (review §3.4)

- [ ] Three surface levels (#060B11 / #111A24 / #1A2633) with 1 px borders at 12–16 % white.
- [ ] Single night tone (drop the blue/green mix).
- [ ] Mint accent only for interactive elements; labels in light grey.
- [ ] 12 px minimum text (labels 12, body 15–16, titles 22–28).
- [ ] Compact project cards in a 2–3 column grid on desktop.
- [ ] "What do you want to do?": three cards side by side, no auto carousel.
- [ ] Bottom bar fixed only on mobile, or thinner and not covering desktop content.
- [ ] Optional light band for "where to earn Airs" / ally logos.

## 8. Admin panel

- [x] Sign-in screen: hide technical data (API, issuer, client, audience) and "DEV" version (commit `68a660f9`).
- [ ] Opening the panel from the app shield opens a new tab with another sign-in without notice.

## 8b. Copy and content follow-ups found while fixing

- [ ] "Earn Airs with the project's allies" now renders as text: the public project payload has no
      list of the project's allies; add it to show them on the page.
- [ ] Landing and onboarding copy (packages/i18n) still says "AIRS" and "verificable/verificada";
      rewrite with the brand language rules.
- [ ] Enterprise "torneo-swing-golf-rincon-cajica" description (DB content) mentions "puntos";
      fix it from the admin panel.
- [ ] `@alternun/i18n` has no plural support; explorer uses `_one`/`_other` keys via a helper.

## 8c. Release and history sync (PR #313)

- [x] `pnpm release patch` → `v1.2.7-dev.0` deployed to testnet (2026-11-17). Verified: API
      `/health` 1.2.7-dev.0; the Lambda's `ADMIN_AUTH_*` now point to the `alternun-admin` provider.
      Fixes after that deploy (`d19392e1` self-approval of completions, `837524bb` CORS) ship in the
      next release.
- [ ] `develop` history was rewritten on purpose (2026-11-14 audit purge). Consequences:
  - PR #313 conflicts with `master` (`CONFLICTING`): same releases with different SHAs, 2,322
    commits ahead.
  - 318 production tags point to pre-rewrite commits; 296 map 1:1 to the new history by release
    commit (e.g. v1.2.6 `f03c79d7` → `dfbd16d5`), 22 are ambiguous.
  - `pnpm release:patch:promote` fails in `publish-production-changelog.mjs` ("Unable to find a
    production tag preceding v1.2.7") because no production tag is reachable from `develop`.
- [ ] **Fix on develop (needs owner to run or allow):** re-point the 296 mapped tags to the new
      history (`git tag -f` + force-push of those tags only; mapping with old SHAs kept for
      rollback), then `pnpm release:patch:promote` to tag v1.2.7 and refresh PR #313.
- [ ] **Proposed fix to master, after PR #313 is approved:** sync `master` to the approved release
      commit of the new history instead of a merge (a merge would bring back the purged history).
      This triggers the production pipeline; verify `dash-prod` and `/health` afterwards.

## 9. Testnet data left by the review (clean up when done)

- Pending enterprise applications (3), one test gallery photo, one hidden test comment and one
  40-Airs report in review on La Matilde.

## Evidence

- Tests: API 583/585 (2 failures pre-existing on develop in `project-client.test.ts`), admin
  111/111, infra 92/92, mobile 706/706 with coverage.
