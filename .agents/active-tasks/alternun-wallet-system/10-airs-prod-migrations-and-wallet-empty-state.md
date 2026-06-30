---
name: airs-prod-migrations-wallet-empty-state
title: Production AIRS migrations and wallet empty state
priority: high
status: implemented-pending-live-verification
depends_on: [wallet-server-module-api, wallet-mobile-creation-backup-flow]
---

# Task 10 — Production AIRS recovery + wallet empty state

This follow-up tracks the live issue reported by the app:

- `GET /v1/airs/leaderboard?limit=20` returning `500`
- `GET /v1/airs/me` returning `500`
- ATN dashboard wallet card showing a hardcoded dummy address instead of the real wallet state

Implementation status on 2026-06-29:

- production migrations `20260629_0001` and `20260629_0002` have been applied
- the dashboard wallet card now reads real wallet state and falls back to a setup prompt when no wallet exists
- a regression test covers the no-wallet branch

## Scope

1. Verify the production backend migration queue against the live database using the stage-aware sync wrapper.
2. Apply the pending safe migrations one at a time if they are still missing:
   - `supabase/migrations/20260629_0001_airs_eligible_users_count.sql`
   - `supabase/migrations/20260629_0002_wallet_encrypted_seeds.sql`
3. Re-run the migration preview after each apply and stop if any migration is already present or the database state diverges.
4. Update `apps/mobile/components/dashboard/DashboardSummaryCards.tsx` so the ATN wallet panel:
   - reads actual local wallet accounts when they exist
   - shows a setup state when no local wallet exists
   - never renders a fake placeholder address
   - stays usable if `/v1/wallet/accounts` fails or the wallet tables are not available yet
5. Add a small regression test for the wallet-card empty state so the dashboard cannot regress back to dummy data.

## Acceptance criteria

- [ ] Production dry-run reports no pending migrations after the safe apply path is complete.
- [ ] `/v1/airs/leaderboard` no longer depends on a missing migration function.
- [ ] The dashboard wallet card shows real wallet data when available.
- [ ] The dashboard wallet card shows a setup prompt when the user has no local wallet.
- [ ] The dashboard wallet card does not crash if the wallet API returns an error.

## Revertability

- The UI change is additive and reversible by restoring the old card branch.
- The database work is additive only; no destructive migration is part of this task.
