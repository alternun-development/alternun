-- Legacy reverse sync cleanup.
-- Supabase auth.users is now the source of truth for signup, so this file
-- only exists to make the old public -> auth path easy to remove.

drop function if exists public.sync_public_user_to_auth_user();
