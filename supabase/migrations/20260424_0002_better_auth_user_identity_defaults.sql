-- Better Auth inserts public.users rows directly during social OAuth.
-- Keep this migration safe across both the historical uuid-based drift and the
-- current text-based schema so we can heal production without breaking fresh
-- installs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS trg_public_users_fill_better_auth_identity ON public.users;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'sub'
      AND data_type <> 'text'
  ) THEN
    EXECUTE 'ALTER TABLE public.users ALTER COLUMN sub TYPE text USING sub::text';
  END IF;
END;
$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sub text,
  ADD COLUMN IF NOT EXISTS iss text,
  ADD COLUMN IF NOT EXISTS aud text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS picture text;

UPDATE public.users
SET id = COALESCE(NULLIF(id, ''), gen_random_uuid()::text),
    sub = COALESCE(NULLIF(sub, ''), NULLIF(id, ''), gen_random_uuid()::text),
    iss = COALESCE(NULLIF(iss, ''), 'better-auth'),
    aud = COALESCE(NULLIF(aud, ''), 'authenticated'),
    provider = COALESCE(NULLIF(provider, ''), 'better-auth'),
    picture = COALESCE(picture, image),
    updated_at = timezone('utc', now())
WHERE id IS NULL
   OR id = ''
   OR sub IS NULL
   OR sub = ''
   OR iss IS NULL
   OR iss = ''
   OR aud IS NULL
   OR aud = ''
   OR provider IS NULL
   OR provider = ''
   OR (picture IS NULL AND image IS NOT NULL);

ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN sub SET NOT NULL,
  ALTER COLUMN iss SET DEFAULT 'better-auth',
  ALTER COLUMN iss SET NOT NULL,
  ALTER COLUMN aud SET DEFAULT 'authenticated',
  ALTER COLUMN provider SET DEFAULT 'better-auth';

CREATE OR REPLACE FUNCTION public.fill_public_users_better_auth_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    NEW.id := gen_random_uuid()::text;
  END IF;

  NEW.sub := COALESCE(NULLIF(btrim(NEW.sub), ''), NEW.id);
  NEW.iss := COALESCE(NULLIF(btrim(NEW.iss), ''), 'better-auth');
  NEW.aud := COALESCE(NULLIF(btrim(NEW.aud), ''), 'authenticated');
  NEW.provider := COALESCE(NULLIF(btrim(NEW.provider), ''), 'better-auth');
  NEW.picture := COALESCE(NEW.picture, NEW.image);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_users_fill_better_auth_identity ON public.users;

CREATE TRIGGER trg_public_users_fill_better_auth_identity
BEFORE INSERT OR UPDATE OF id, sub, iss, aud, provider, image, picture
ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.fill_public_users_better_auth_identity();
