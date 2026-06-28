-- Backfill airs_balance and airs_lifetime_earned for all users from airs_ledger_entries.
--
-- Why: The airs_apply_ledger_entry_to_user trigger may have silently failed in
-- production (UUID vs TEXT type comparison edge case), leaving airs_balance = 0
-- even when ledger entries exist. This migration recomputes the aggregate from
-- the authoritative source (airs_ledger_entries) for any user whose balance
-- does not match the ledger sum.
--
-- Safe to run multiple times: only touches rows where computed balance differs.
-- Works on both UUID (prod) and TEXT (dev) public.users.id via ::text cast.

UPDATE public.users u
SET
  airs_balance         = COALESCE(agg.total_balance, 0),
  airs_lifetime_earned = COALESCE(agg.total_earned, 0)
FROM (
  SELECT
    user_id::text                                                        AS uid,
    SUM(airs_delta)                                                      AS total_balance,
    SUM(CASE WHEN airs_delta > 0 THEN airs_delta ELSE 0 END)            AS total_earned
  FROM public.airs_ledger_entries
  GROUP BY user_id
) agg
WHERE u.id::text = agg.uid
  AND (
    u.airs_balance         IS DISTINCT FROM COALESCE(agg.total_balance, 0)
    OR
    u.airs_lifetime_earned IS DISTINCT FROM COALESCE(agg.total_earned, 0)
  );
