-- Legacy Better Auth public->auth identity fill disabled.
-- Supabase auth.users is the source of truth for signup, so this cleanup file
-- only removes the old reverse-sync helper trigger.
DROP TRIGGER IF EXISTS trg_public_users_fill_better_auth_identity ON public.users;
