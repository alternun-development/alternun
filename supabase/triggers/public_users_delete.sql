-- Legacy reverse delete sync disabled.
-- Keep this file as a cleanup script for the old public -> auth path.
DROP TRIGGER IF EXISTS trg_public_users_delete_sync_to_auth_users ON public.users;
