-- Force-drop the uuid overloads of AIRS functions that 20260626_0004 should have removed
-- but didn't (the uuid overloads still exist in prod DB with OIDs 66639 and 66642,
-- causing PGRST203 ambiguity — PostgREST can't choose between text and uuid overloads).
-- 20260626_0004 is recorded in _migrations but the DROPs never took effect.

drop function if exists public.airs_record_dashboard_visit(uuid, text, jsonb);
drop function if exists public.airs_get_dashboard_snapshot(uuid, text, integer);
