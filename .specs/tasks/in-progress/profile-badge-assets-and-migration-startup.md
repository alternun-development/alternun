---
title: AIRS profile badge assets and migration startup repair
area: mobile, api
owner: unassigned
priority: unspecified
issue: not linked
release: unspecified
dependencies: active development Supabase project for live migration verification
---

## Plan

1. Inspect reference PDF, PSD layers and existing profile badge/state ownership.
2. Export transparent app-local artwork and wire existing profile tiers/achievements.
3. Diagnose migration connection failure, correct local runner defects and add regression tests.
4. Validate exports, components, type checks and API tests; document external blockers.

## Acceptance

- Supplied artwork is organized in AIRS app assets with a reproducible export script.
- Existing earning rules, locked state and tooltip actions are preserved.
- Migration startup resolves the root migration directory and reports inactive-target errors safely.
- Live migration success remains pending restoration of the inactive development project.

## Validation evidence

- Badge component regression tests: 3 passing (earned, locked, fallback and press action).
- API migration regression tests: 6 passing; API type-check passes.
- Full API suite: 161 passing, 4 existing AIRS/referral failures outside this change.
- Mobile type-check remains blocked by existing app/shared-package errors.
- Translation package type-check passes.
- React Doctor: 74/100, one complexity warning in the existing profile component.
- Exported artwork inspected for transparency, dimensions, cropping and visual fidelity.
- PinchTab reached the local AIRS app; authenticated profile QA requires a signed-in session.
- Development Supabase is INACTIVE; no remote project state or credentials changed.
- Expo web export passes (`expo export --platform web --output-dir /tmp/airs-profile-web`).
- Profile lint baseline confirms existing comma/indent errors; new components pass with the conflicting comma-dangle rule disabled.
- All 71 repository SQL migration filenames match the startup runner convention.

## Tier details follow-up

Plan: extract the journey into a testable component; open a responsive detail modal
from every tier; use 3D artwork, shared tier thresholds and documented AIRS benefit
categories; localize content; test selection, dismissal and unknown score states.
The supplied PDF contains placeholder benefit text. Tier-specific entitlements are
not defined in the repository, so explain common benefits subject to eligibility.

Tier-modal validation: 11 profile tests pass (all four tier selections, dismissal,
artwork and score states). Expo web export and i18n type-check pass. No new tier
component errors in the mobile type-check; existing unrelated failures remain.
PinchTab inspected an isolated render of the actual journey/modal with canonical
tier data and catalog copy: 375px mobile panel fits at 335px wide and 692px high;
1000px desktop panel fits at 760px wide. Desktop Escape dismissal works. Browser
reported no uncaught errors. This component check does not replace signed-in
profile integration QA. Supabase restoration is being handled by the user.
