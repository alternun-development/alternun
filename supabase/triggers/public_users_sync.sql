-- Legacy reverse sync disabled.
-- Supabase auth.users is now the source of truth for signup. Keep this file
-- as an explicit cleanup script so the old public -> auth path cannot linger.

DROP TRIGGER IF EXISTS trg_public_users_sync_to_auth_users ON public.users;
