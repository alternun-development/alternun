-- Repair the privilege that PostgreSQL grants to PUBLIC by default for the
-- notification helper deployed before this safeguard existed. Triggers still
-- invoke it as the function owner; clients cannot reach it through RPC.

revoke all on function public.create_user_notification(text, text, text, jsonb, text) from public;
revoke all on function public.create_user_notification(text, text, text, jsonb, text) from anon;
revoke all on function public.create_user_notification(text, text, text, jsonb, text) from authenticated;
