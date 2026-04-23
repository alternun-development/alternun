-- Legacy Better Auth identity cleanup.
-- Supabase auth.users is now the signup source of truth.

drop function if exists public.fill_public_users_better_auth_identity();
