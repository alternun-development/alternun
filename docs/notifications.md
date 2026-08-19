# User Notifications

The AIRS notification feed is a persistent, user-scoped activity feed. It replaces the former client-side sample notifications; no notification is created by the mobile UI.

## Delivery path

```text
Completed domain action → Supabase trigger → public.user_notifications
  → authenticated API (/v1/notifications) → AIRS notification UI
```

The mobile client fetches after authentication, after a relevant successful action, and every 15 seconds while the user is signed in. This is near-real-time delivery with an authenticated API boundary; it is deliberately not a public Supabase Realtime subscription.

The API resolves the bearer token to an application user ID before using the Supabase service role. `user_notifications` has RLS enabled and no direct client policy, so a client cannot query or mutate another user's feed.

## Current event catalogue

| Event type               | Created when                                        | Recipient      |
| ------------------------ | --------------------------------------------------- | -------------- |
| `registration_completed` | An application user record is created               | New user       |
| `airs_credited`          | A positive AIRS ledger entry is recorded            | AIRS recipient |
| `referral_confirmed`     | An invitee becomes confirmed                        | Referrer       |
| `wallet_connected`       | A wallet with an application-user link is connected | Wallet owner   |
| `profile_completed`      | The profile-completion lifecycle event is recorded  | Profile owner  |

Negative ledger corrections do not produce a success notification. Navigation, settings changes, and other reversible UI interactions do not produce feed entries; notifications are reserved for durable account or value changes.

## API

- `GET /v1/notifications?limit=50` returns active notifications for the bearer-token owner.
- `PATCH /v1/notifications/:notificationId` accepts `read`, `archived`, and/or `deleted` booleans.
- `POST /v1/notifications/read-all` marks active inbox entries as read.

The payload stores event data only. The client converts event types and payload values into localized copy through `packages/i18n`; it does not persist translated text.

## Adding a new notification event

1. Add the event type to the migration constraint and a database trigger/function at the authoritative completed-action boundary.
2. Use a stable `(user_id, dedupe_key)` to make retries safe.
3. Add title/body keys for English, Spanish, and Thai catalogs.
4. Extend the mobile event-to-copy mapper and add focused API/mobile tests.
5. Update this catalogue in the same change.

Do not add notification generation to a client callback. The database event must remain the source of truth so that retries, background jobs, and multiple clients generate one consistent feed item.
