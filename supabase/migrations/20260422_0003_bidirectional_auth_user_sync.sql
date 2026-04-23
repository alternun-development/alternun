-- Bidirectional sync between auth.users and public.users.
-- Keeps both tables aligned whether a user is created in Supabase Auth or in
-- the app-facing public.users table.

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.is_anonymous then
    return new;
  end if;

  insert into public.users (
    id,
    aud,
    email,
    email_verified,
    name,
    image,
    picture,
    phone,
    phone_verified,
    confirmation_sent_at,
    last_sign_in_at
  )
  values (
    new.id::text,
    coalesce(new.raw_app_meta_data->>'aud', 'authenticated'),
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.phone,
    new.phone_confirmed_at is not null,
    new.confirmation_sent_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        image          = excluded.image,
        picture        = excluded.picture,
        phone          = excluded.phone,
        phone_verified = excluded.phone_verified,
        confirmation_sent_at = excluded.confirmation_sent_at,
        last_sign_in_at = excluded.last_sign_in_at,
        aud            = excluded.aud,
        updated_at     = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.user_profiles_handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    avatar_url,
    idp_provider,
    idp_subject,
    metadata
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'supabase'),
    coalesce(new.raw_app_meta_data->>'provider_id', new.id::text),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (user_id)
  do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        idp_provider = excluded.idp_provider,
        idp_subject = excluded.idp_subject,
        metadata = excluded.metadata,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.sync_public_user_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  insert into auth.users (
    id,
    email,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    confirmation_sent_at,
    last_sign_in_at,
    raw_user_meta_data,
    raw_app_meta_data,
    is_anonymous
  )
  values (
    new.id::uuid,
    new.email,
    case when new.email_verified then timezone('utc', now()) else null end,
    new.phone,
    case when new.phone_verified then timezone('utc', now()) else null end,
    new.confirmation_sent_at,
    new.last_sign_in_at,
    jsonb_build_object(
      'name', new.name,
      'full_name', new.name,
      'avatar_url', coalesce(new.picture, new.image),
      'picture', coalesce(new.picture, new.image),
      'email', new.email,
      'phone', new.phone
    ),
    jsonb_build_object(
      'aud', new.aud
    ),
    false
  )
  on conflict (id) do update
    set email             = excluded.email,
        email_confirmed_at = excluded.email_confirmed_at,
        phone              = excluded.phone,
        phone_confirmed_at = excluded.phone_confirmed_at,
        confirmation_sent_at = excluded.confirmation_sent_at,
        last_sign_in_at    = excluded.last_sign_in_at,
        raw_user_meta_data = excluded.raw_user_meta_data,
        raw_app_meta_data  = excluded.raw_app_meta_data,
        updated_at         = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_auth_users_sync_to_app_users on auth.users;
create trigger trg_auth_users_sync_to_app_users
after insert or update of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function sync_auth_user_to_app_users();

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
after insert on auth.users
for each row
execute function user_profiles_handle_auth_user_created();

drop trigger if exists trg_public_users_sync_to_auth_users on public.users;
create trigger trg_public_users_sync_to_auth_users
after insert or update of email, name, image, picture, email_verified, phone, phone_verified, confirmation_sent_at, last_sign_in_at, aud
on public.users
for each row
execute function sync_public_user_to_auth_user();

-- Backfill existing rows in both directions so the mirrors are aligned on deploy.
insert into auth.users (
  id,
  email,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_anonymous
)
select
  p.id::uuid,
  p.email,
  case when p.email_verified then timezone('utc', now()) else null end,
  p.phone,
  case when p.phone_verified then timezone('utc', now()) else null end,
  p.confirmation_sent_at,
  p.last_sign_in_at,
  jsonb_build_object(
    'name', p.name,
    'full_name', p.name,
    'avatar_url', coalesce(p.picture, p.image),
    'picture', coalesce(p.picture, p.image),
    'email', p.email,
    'phone', p.phone
  ),
  jsonb_build_object(
    'aud', p.aud
  ),
  false
from public.users p
on conflict (id) do update
  set email             = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at,
      phone              = excluded.phone,
      phone_confirmed_at = excluded.phone_confirmed_at,
      confirmation_sent_at = excluded.confirmation_sent_at,
      last_sign_in_at    = excluded.last_sign_in_at,
      raw_user_meta_data = excluded.raw_user_meta_data,
      raw_app_meta_data  = excluded.raw_app_meta_data,
      updated_at         = timezone('utc', now());

insert into public.users (
  id,
  aud,
  email,
  email_verified,
  name,
  image,
  picture,
  phone,
  phone_verified,
  confirmation_sent_at,
  last_sign_in_at
)
select
  u.id::text,
  coalesce(u.raw_app_meta_data->>'aud', 'authenticated'),
  u.email,
  u.email_confirmed_at is not null,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  u.phone,
  u.phone_confirmed_at is not null,
  u.confirmation_sent_at,
  u.last_sign_in_at
from auth.users u
where not u.is_anonymous
on conflict (id) do update
  set email          = excluded.email,
      email_verified = excluded.email_verified,
      name           = excluded.name,
      image          = excluded.image,
      picture        = excluded.picture,
      phone          = excluded.phone,
      phone_verified = excluded.phone_verified,
      confirmation_sent_at = excluded.confirmation_sent_at,
      last_sign_in_at = excluded.last_sign_in_at,
      aud            = excluded.aud,
      updated_at     = timezone('utc', now());
