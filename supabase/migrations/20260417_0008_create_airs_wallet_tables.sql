create extension if not exists pgcrypto;

create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('airs_hd', 'external')),
  label text,
  derivation_index integer not null default 0,
  evm_address text,
  bitcoin_address text,
  solana_address text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wallet_accounts_user_primary_uidx
  on public.wallet_accounts (user_id)
  where is_primary = true;

create index if not exists wallet_accounts_user_id_idx
  on public.wallet_accounts (user_id);

create table if not exists public.wallet_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  default_chain text not null default 'ethereum',
  currency_display text not null default 'USD',
  pin_salt text,
  pin_hash text,
  has_local_wallet boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists wallet_preferences_user_id_idx
  on public.wallet_preferences (user_id);

create table if not exists public.wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_account_id uuid references public.wallet_accounts(id) on delete set null,
  session_key text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wallet_sessions_session_key_uidx
  on public.wallet_sessions (session_key);

create index if not exists wallet_sessions_user_id_idx
  on public.wallet_sessions (user_id);

create or replace function public.wallet_records_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_wallet_accounts_set_updated_at on public.wallet_accounts;
create trigger trg_wallet_accounts_set_updated_at
before update on public.wallet_accounts
for each row
execute function public.wallet_records_set_updated_at();

drop trigger if exists trg_wallet_preferences_set_updated_at on public.wallet_preferences;
create trigger trg_wallet_preferences_set_updated_at
before update on public.wallet_preferences
for each row
execute function public.wallet_records_set_updated_at();

drop trigger if exists trg_wallet_sessions_set_updated_at on public.wallet_sessions;
create trigger trg_wallet_sessions_set_updated_at
before update on public.wallet_sessions
for each row
execute function public.wallet_records_set_updated_at();

alter table public.wallet_accounts enable row level security;
alter table public.wallet_preferences enable row level security;
alter table public.wallet_sessions enable row level security;

drop policy if exists wallet_accounts_user_owns_rows on public.wallet_accounts;
create policy wallet_accounts_user_owns_rows
on public.wallet_accounts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists wallet_preferences_user_owns_rows on public.wallet_preferences;
create policy wallet_preferences_user_owns_rows
on public.wallet_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists wallet_sessions_user_owns_rows on public.wallet_sessions;
create policy wallet_sessions_user_owns_rows
on public.wallet_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.wallet_accounts to authenticated;
grant select, insert, update, delete on public.wallet_preferences to authenticated;
grant select, insert, update, delete on public.wallet_sessions to authenticated;
