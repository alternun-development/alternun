-- Repair production schema drift: the migration ledger records the original
-- overload cleanup, but several legacy UUID signatures still exist in the live
-- schema. PostgREST cannot safely resolve calls when a text signature and a
-- UUID signature share the same RPC name.
--
-- AIRS application code always supplies Better Auth user IDs as text. These
-- drops are idempotent and retain the canonical text RPCs.

drop function if exists public.airs_award_registration_bonus(uuid, numeric);
drop function if exists public.airs_award_profile_completion_bonus(uuid, numeric, text, jsonb);
drop function if exists public.airs_mark_welcome_email_sent(uuid, text, jsonb);
drop function if exists public.airs_record_dashboard_visit(uuid, text, jsonb);
drop function if exists public.airs_get_dashboard_snapshot(uuid, text, integer);
