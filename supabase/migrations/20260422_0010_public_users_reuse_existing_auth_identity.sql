-- Better Auth sign-up can leave a public.users row before the mirrored auth.users
-- row exists. If an auth.users row already exists for the same email, reuse its
-- UUID so the public -> auth mirror updates the existing record instead of
-- colliding on auth.users.email.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.fill_public_users_better_auth_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  existing_auth_id uuid;
BEGIN
  IF new.email IS NOT NULL THEN
    SELECT id
      INTO existing_auth_id
    FROM auth.users
    WHERE email = new.email
    LIMIT 1;

    IF existing_auth_id IS NOT NULL THEN
      new.id := existing_auth_id::text;
    END IF;
  END IF;

  IF new.id IS NULL OR btrim(new.id) = '' THEN
    new.id := gen_random_uuid()::text;
  END IF;

  new.sub := COALESCE(new.sub, new.id);
  new.iss := COALESCE(new.iss, 'better-auth');
  RETURN new;
END;
$$;
