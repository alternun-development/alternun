-- Wallet registry per user for AIRS / Alternun mobile auth flows.
-- Run in Supabase SQL editor or via Supabase migrations pipeline.

create extension if not exists pgcrypto;

create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chain text not null default 'ethereum',
  wallet_provider text not null default 'unknown',
  wallet_address text not null,
  wallet_address_normalized text not null,
  is_primary boolean not null default false,
  linked_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_wallets_chain_len_chk check (char_length(chain) <= 50),
  constraint user_wallets_provider_len_chk check (char_length(wallet_provider) <= 50)
);

create unique index if not exists user_wallets_user_chain_address_uidx
  on public.user_wallets (user_id, chain, wallet_address_normalized);

-- Enforces one wallet identity per chain globally.
create unique index if not exists user_wallets_chain_address_uidx
  on public.user_wallets (chain, wallet_address_normalized);

-- Exactly one primary wallet at most per user.
create unique index if not exists user_wallets_single_primary_per_user_uidx
  on public.user_wallets (user_id) where is_primary = true;

create index if not exists user_wallets_user_id_idx
  on public.user_wallets (user_id);

create index if not exists user_wallets_last_used_at_idx
  on public.user_wallets (last_used_at desc);

create or replace function public.user_wallets_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_wallets_set_updated_at on public.user_wallets;
create trigger trg_user_wallets_set_updated_at
before update on public.user_wallets
for each row
execute function public.user_wallets_set_updated_at();

create or replace function public.user_wallets_keep_single_primary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_primary then
    update public.user_wallets
       set is_primary = false,
           updated_at = timezone('utc', now())
     where user_id = new.user_id
       and id <> new.id
       and is_primary = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_wallets_keep_single_primary on public.user_wallets;
create trigger trg_user_wallets_keep_single_primary
after insert or update of is_primary on public.user_wallets
for each row
execute function public.user_wallets_keep_single_primary();

alter table public.user_wallets enable row level security;

drop policy if exists user_wallets_select_own on public.user_wallets;
create policy user_wallets_select_own
on public.user_wallets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_wallets_insert_own on public.user_wallets;
create policy user_wallets_insert_own
on public.user_wallets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_wallets_update_own on public.user_wallets;
create policy user_wallets_update_own
on public.user_wallets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_wallets_delete_own on public.user_wallets;
create policy user_wallets_delete_own
on public.user_wallets
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_wallets to authenticated;

