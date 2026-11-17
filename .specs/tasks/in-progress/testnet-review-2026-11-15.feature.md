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

- [x] #74 CORS header echoed the request origin → now echoes the configured origin.
- [x] #75 Missing rate limiting on email sign-in → explicit Better Auth `rateLimit` (memory, per
      Lambda instance). Follow-up: shared storage if abuse appears.
- [x] #76, #77 Polynomial ReDoS in honor-award email check → linear-time check.
- [x] #67 Shell command built from an absolute path (infra test) → path passed via env.

## 2. Airs approval flow

- [ ] In-app screen for "In review" Airs, for global admins / approvers (there are 5-day-old
      reports pending; today approval only exists in the admin panel).
- [ ] Review email: a real button, not a plain-text link.
- [ ] No notification arrived for a new 40-Airs assignment.
- [ ] Automatic-approval threshold looks low (40 Airs already go to manual review). Confirm the
      threshold and whether it should be configurable per project/enterprise (**decision**).
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

## 9. Testnet data left by the review (clean up when done)

- Pending enterprise applications (3), one test gallery photo, one hidden test comment and one
  40-Airs report in review on La Matilde.

## Evidence

- Tests: API 583/585 (2 failures pre-existing on develop in `project-client.test.ts`), admin
  111/111, infra 92/92, mobile 706/706 with coverage.
