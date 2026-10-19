# Issue #107: Global Activity Feed — Phase 2: engagement, discovery, and realtime

**Status:** open
**Created:** 2026-04-17T19:54:12Z
**Updated:** 2026-10-09T15:14:12Z
**Author:** lstech-solutions (@lstech-solutions)
**URL:** https://github.com/alternun-development/alternun/issues/107

## Description

Follow-up to #105.

Phase 1 (core feed MVP) is now on `develop`; this issue tracks the next slice of the global activity feed program.

## Scope

- Persist and expose likes, comments, and shares.
- Add engagement endpoints for feed items and user activity.
- Add discovery features such as trending, search, and follow-based ranking.
- Add realtime fanout for new activities and engagement updates.
- Tighten user attribution and verified profile badges if needed.

## Notes

- Keep the implementation aligned with the existing `activity` module and Supabase schema conventions.
- Prefer incremental delivery so each phase is testable and deployable on its own.

## Labels

type:feature, area:backend, area:data, status:planned

## Assignees

None
