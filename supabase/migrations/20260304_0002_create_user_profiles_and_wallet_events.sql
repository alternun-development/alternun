-- User profile + wallet audit schema for Alternun auth flows.
-- Builds on top of 20260303_0001_create_user_wallets.sql

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  idp_provider text not null default 'supabase',
  idp_subject text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_profiles_idp_provider_len_chk check (char_length(idp_provider) <= 100)
);

create unique index if not exists user_profiles_idp_subject_uidx
  on public.user_profiles (idp_provider, idp_subject)
  where idp_subject is not null;

create or replace function public.user_profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_set_updated_at on public.user_profiles;
create trigger trg_user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.user_profiles_set_updated_at();

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
    coalesce(new.app_metadata->>'provider', 'supabase'),
    coalesce(new.app_metadata->>'provider_id', new.id::text),
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

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
after insert on auth.users
for each row
execute function public.user_profiles_handle_auth_user_created();

-- Backfill profile rows for existing users.
insert into public.user_profiles (
  user_id,
  email,
  display_name,
  avatar_url,
  idp_provider,
  idp_subject,
  metadata
)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  coalesce(u.app_metadata->>'provider', 'supabase'),
  coalesce(u.app_metadata->>'provider_id', u.id::text),
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
on conflict (user_id)
do update
  set email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      idp_provider = excluded.idp_provider,
      idp_subject = excluded.idp_subject,
      metadata = excluded.metadata,
      updated_at = timezone('utc', now());

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, update on public.user_profiles to authenticated;

create table if not exists public.user_wallet_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.user_wallets(id) on delete set null,
  chain text,
  wallet_address_normalized text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_wallet_events_type_len_chk check (char_length(event_type) <= 64)
);

create index if not exists user_wallet_events_user_id_created_at_idx
  on public.user_wallet_events (user_id, created_at desc);

create index if not exists user_wallet_events_wallet_id_idx
  on public.user_wallet_events (wallet_id);

create or replace function public.user_wallets_write_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_wallet_id uuid;
  target_chain text;
  target_address text;
  next_event text;
  event_payload jsonb;
begin
  if TG_OP = 'INSERT' then
    target_user_id := new.user_id;
    target_wallet_id := new.id;
    target_chain := new.chain;
    target_address := new.wallet_address_normalized;
    next_event := 'linked';
    event_payload := jsonb_build_object(
      'wallet_provider', new.wallet_provider,
      'is_primary', new.is_primary,
      'metadata', coalesce(new.metadata, '{}'::jsonb)
    );
  elsif TG_OP = 'UPDATE' then
    target_user_id := new.user_id;
    target_wallet_id := new.id;
    target_chain := new.chain;
    target_address := new.wallet_address_normalized;

    if old.is_primary is distinct from new.is_primary and new.is_primary then
      next_event := 'set_primary';
    elsif old.last_used_at is distinct from new.last_used_at then
      next_event := 'used';
    elsif old.wallet_provider is distinct from new.wallet_provider
       or old.metadata is distinct from new.metadata then
      next_event := 'metadata_updated';
    else
      next_event := 'updated';
    end if;

    event_payload := jsonb_build_object(
      'before', to_jsonb(old),
      'after', to_jsonb(new)
    );
  elsif TG_OP = 'DELETE' then
    target_user_id := old.user_id;
    target_wallet_id := old.id;
    target_chain := old.chain;
    target_address := old.wallet_address_normalized;
    next_event := 'unlinked';
    event_payload := to_jsonb(old);
  else
    return null;
  end if;

  insert into public.user_wallet_events (
    user_id,
    wallet_id,
    chain,
    wallet_address_normalized,
    event_type,
    payload
  )
  values (
    target_user_id,
    target_wallet_id,
    target_chain,
    target_address,
    next_event,
    event_payload
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_wallets_write_event on public.user_wallets;
create trigger trg_user_wallets_write_event
after insert or update or delete on public.user_wallets
for each row
execute function public.user_wallets_write_event();

alter table public.user_wallet_events enable row level security;

drop policy if exists user_wallet_events_select_own on public.user_wallet_events;
create policy user_wallet_events_select_own
on public.user_wallet_events
for select
to authenticated
using (auth.uid() = user_id);

grant select on public.user_wallet_events to authenticated;
