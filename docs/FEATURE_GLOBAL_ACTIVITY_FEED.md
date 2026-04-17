# Feature: Global Activity Feed

Issue reference: https://github.com/alternun-development/alternun/issues/105

## Scope delivered in this change

This iteration delivers **Phase 1 (Core Feed MVP)** and foundational pieces for Phase 2:

- Added new API module: `activity`.
- Added global feed endpoint with cursor pagination.
- Added user feed endpoint.
- Added platform stats endpoint.
- Added internal activity write endpoint.
- Added actor attribution fields (username, avatar, display name, last activity status).
- Added emoji activity icon mapping based on activity type.

## API Endpoints

- `GET /activity/feed`
  - Query: `limit`, `cursor`, `type`
  - Returns: globally visible `public` activity records ordered by `created_at desc`.
- `GET /activity/user/:userId`
  - Query: `limit`, `cursor`
  - Returns: activity records for one user.
- `GET /activity/stats`
  - Returns: total activities, active users in the last 24h, and top activity types.
- `POST /activity`
  - Header: `x-internal-api-key` (validated when `ACTIVITY_INTERNAL_API_KEY` is configured)
  - Creates activity records for internal producers.

## Expected Supabase schema

The implementation reads/writes the following table/column shape:

- `public.user_activity`
  - `id`, `user_id`, `activity_type`, `message`, `metadata`, `visibility`
  - `likes_count`, `comments_count`, `shares_count`, `created_at`
- `public.users`
  - `id`, `username`, `display_name`, `avatar_url`, `last_activity_at`

Recommended enum values for `activity_type`:

- `airs_earned`
- `profile_completed`
- `purchase`
- `referral`
- `impact`
- `streak`

## Follow-up phases (not part of this commit)

1. **User attribution enrichment**
   - Resolve verified profile badges and richer status model.
2. **Engagement system**
   - Persist likes/comments/shares and add dedicated endpoints.
3. **Discovery layer**
   - Trending, following graph feed, and search ranking.
4. **Real-time updates**
   - WebSocket and notification fan-out.
