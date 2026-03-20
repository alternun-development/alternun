-- Mirror every Supabase Auth user into public.users for vendor independence.
--
-- Email sign-ups (and any OAuth method brokered directly by Supabase Auth)
-- are written into public.users so the app can migrate away from auth.users
-- without losing user data.
--
-- Identity key: sub = auth.users.id::text, iss = 'supabase'
-- This is intentionally different from Authentik OIDC users whose iss is the
-- Authentik issuer URL, so both can coexist in the same table.

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip anonymous users (Supabase anonymous auth)
  if new.is_anonymous then
    return new;
  end if;

  insert into public.users (sub, iss, email, email_verified, name, picture, provider, raw_claims)
  values (
    new.id::text,
    'supabase',
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (sub, iss) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        picture        = excluded.picture,
        provider       = excluded.provider,
        raw_claims     = excluded.raw_claims,
        updated_at     = timezone('utc', now());

  return new;
end;
$$;

-- Fire on INSERT (new sign-up) and on the specific UPDATE columns that carry
-- meaningful user data changes: email confirmation, email change, profile metadata.
drop trigger if exists trg_auth_users_sync_to_app_users on auth.users;
create trigger trg_auth_users_sync_to_app_users
after insert or update of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function public.sync_auth_user_to_app_users();

-- Backfill existing Supabase Auth users who signed up before this migration.
insert into public.users (sub, iss, email, email_verified, name, picture, provider, raw_claims)
select
  u.id::text,
  'supabase',
  u.email,
  u.email_confirmed_at is not null,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  coalesce(u.raw_app_meta_data->>'provider', 'email'),
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
where not u.is_anonymous
on conflict (sub, iss) do update
  set email          = excluded.email,
      email_verified = excluded.email_verified,
      name           = excluded.name,
      picture        = excluded.picture,
      provider       = excluded.provider,
      raw_claims     = excluded.raw_claims,
      updated_at     = timezone('utc', now());
