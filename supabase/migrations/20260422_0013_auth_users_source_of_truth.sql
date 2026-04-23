-- Auth users are the source of truth for signup.
-- This migration removes the old public -> auth reverse sync, backfills
-- missing public.users rows from auth.users, and keeps the auth -> public
-- mirror active.

insert into public.users (
  id,
  sub,
  iss,
  aud,
  email,
  email_verified,
  name,
  image,
  picture,
  phone,
  phone_verified,
  confirmation_sent_at,
  last_sign_in_at,
  provider
)
select
  a.id::text,
  a.id::text,
  'supabase',
  coalesce(a.raw_app_meta_data->>'aud', 'authenticated'),
  a.email,
  a.email_confirmed_at is not null,
  coalesce(
    a.raw_user_meta_data->>'name',
    a.raw_user_meta_data->>'full_name',
    split_part(coalesce(a.email, ''), '@', 1)
  ),
  coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture'),
  coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture'),
  a.phone,
  a.phone_confirmed_at is not null,
  a.confirmation_sent_at,
  a.last_sign_in_at,
  'supabase'
from auth.users a
where not a.is_anonymous
  and a.email is not null
  and not exists (
    select 1
    from public.users p
    where p.email = a.email
  )
on conflict (id) do update
  set sub = excluded.sub,
      iss = excluded.iss,
      aud = excluded.aud,
      email_verified = excluded.email_verified,
      name = excluded.name,
      image = excluded.image,
      picture = excluded.picture,
      phone = excluded.phone,
      phone_verified = excluded.phone_verified,
      confirmation_sent_at = excluded.confirmation_sent_at,
      last_sign_in_at = excluded.last_sign_in_at,
      provider = excluded.provider,
      updated_at = timezone('utc', now());

drop trigger if exists trg_public_users_sync_to_auth_users on public.users;
drop trigger if exists trg_public_users_fill_better_auth_identity on public.users;
drop trigger if exists trg_public_users_delete_sync_to_auth_users on public.users;
drop function if exists public.sync_public_user_to_auth_user();
drop function if exists public.fill_public_users_better_auth_identity();
drop function if exists public.delete_public_user_auth_user();
