# Public AIRS Community Total

The public landing page displays the aggregate AIRS earned by the community in the “How to accumulate AIRS” section.

`GET /v1/airs/community-total` is intentionally unauthenticated and returns only:

- `totalAirs`: the sum of positive `public.airs_ledger_entries.airs_delta` values
- `updatedAt`: the most recent ledger-entry timestamp, or `null` before the first entry

The aggregate is computed in Supabase by `public.airs_get_community_total()` and is accessed through the API service role. The database function is not executable by anonymous or authenticated clients. The response may be shared-cached for 15 seconds; the landing client refreshes it every 30 seconds.

Do not replace this value with a marketing fallback. If the endpoint is unavailable, the UI remains in its loading state rather than publishing an unverifiable figure.
