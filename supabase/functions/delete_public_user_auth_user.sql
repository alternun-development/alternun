-- Legacy reverse delete cleanup.
-- Supabase auth.users is now the signup source of truth.

drop function if exists public.delete_public_user_auth_user();
