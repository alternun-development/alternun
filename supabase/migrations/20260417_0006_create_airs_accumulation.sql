-- AIRS accumulation ledger + onboarding lifecycle.
-- Keeps the source of truth inside Supabase so balance, bonus, and email state
-- can be audited independently from the mobile or API runtimes.

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists airs_balance numeric(18,2) not null default 0,
  add column if not exists airs_lifetime_earned numeric(18,2) not null default 0,
  add column if not exists airs_first_dashboard_at timestamptz,
  add column if not exists airs_welcome_email_sent_at timestamptz,
  add column if not exists airs_profile_bonus_awarded_at timestamptz,
  add column if not exists airs_profile_completed_at timestamptz,
  add column if not exists airs_last_ledger_entry_at timestamptz,
  add column if not exists airs_last_ledger_entry_id uuid;

create table if not exists public.airs_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_kind text not null,
  source_ref text,
  idempotency_key text,
  source_currency text not null default 'USD',
  source_amount numeric(18,2),
  airs_rate numeric(18,4) not null default 5,
  airs_delta numeric(18,2) not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint airs_ledger_entries_source_kind_chk check (
    source_kind in (
      'allied_commerce',
      'validated_regenerative_action',
      'compensation',
      'profile_completion_bonus',
      'correction'
    )
  ),
  constraint airs_ledger_entries_currency_len_chk check (char_length(source_currency) <= 16),
  constraint airs_ledger_entries_source_kind_len_chk check (char_length(source_kind) <= 64),
  constraint airs_ledger_entries_source_ref_len_chk check (source_ref is null or char_length(source_ref) <= 256),
  constraint airs_ledger_entries_idempotency_key_len_chk check (idempotency_key is null or char_length(idempotency_key) <= 256),
  constraint airs_ledger_entries_amount_chk check (source_amount is null or source_amount >= 0),
  constraint airs_ledger_entries_rate_chk check (airs_rate >= 0),
  constraint airs_ledger_entries_delta_chk check (airs_delta <> 0)
);

create index if not exists airs_ledger_entries_user_id_recorded_at_idx
  on public.airs_ledger_entries (user_id, recorded_at desc);

create index if not exists airs_ledger_entries_source_kind_idx
  on public.airs_ledger_entries (source_kind);

create unique index if not exists airs_ledger_entries_idempotency_key_uidx
  on public.airs_ledger_entries (user_id, idempotency_key)
  where idempotency_key is not null;

alter table public.airs_ledger_entries enable row level security;

create table if not exists public.airs_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  ledger_entry_id uuid references public.airs_ledger_entries(id) on delete set null,
  source_kind text,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint airs_lifecycle_events_event_type_chk check (
    event_type in (
      'first_dashboard_view',
      'welcome_email_sent',
      'profile_completed',
      'profile_bonus_awarded'
    )
  ),
  constraint airs_lifecycle_events_event_type_len_chk check (char_length(event_type) <= 64)
);

create index if not exists airs_lifecycle_events_user_id_occurred_at_idx
  on public.airs_lifecycle_events (user_id, occurred_at desc);

create unique index if not exists airs_lifecycle_events_user_event_uidx
  on public.airs_lifecycle_events (user_id, event_type);

alter table public.airs_lifecycle_events enable row level security;

create or replace function public.airs_is_profile_complete(p_user public.users)
returns boolean
language sql
stable
as $$
  select
    coalesce(length(btrim(coalesce(p_user.name, ''))) > 0, false)
    and coalesce(p_user.email_verified, false)
    and coalesce(length(btrim(coalesce(p_user.email, ''))) > 0, false);
$$;

create or replace function public.airs_record_ledger_entry(
  p_user_id uuid,
  p_source_kind text,
  p_airs_delta numeric,
  p_source_ref text default null,
  p_idempotency_key text default null,
  p_source_currency text default 'USD',
  p_source_amount numeric default null,
  p_airs_rate numeric default 5,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.airs_ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.airs_ledger_entries;
  v_user public.users;
  v_idempotency_key text;
begin
  select * into v_user
  from public.users
  where id = p_user_id;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  v_idempotency_key := nullif(btrim(coalesce(p_idempotency_key, p_source_ref, '')), '');

  if v_idempotency_key is not null then
    insert into public.airs_ledger_entries (
      user_id,
      source_kind,
      source_ref,
      idempotency_key,
      source_currency,
      source_amount,
      airs_rate,
      airs_delta,
      notes,
      metadata
    )
    values (
      p_user_id,
      p_source_kind,
      p_source_ref,
      v_idempotency_key,
      p_source_currency,
      p_source_amount,
      p_airs_rate,
      p_airs_delta,
      p_notes,
      p_metadata
    )
    on conflict (user_id, idempotency_key) do update
      set idempotency_key = excluded.idempotency_key
    returning * into v_entry;
  else
    insert into public.airs_ledger_entries (
      user_id,
      source_kind,
      source_ref,
      idempotency_key,
      source_currency,
      source_amount,
      airs_rate,
      airs_delta,
      notes,
      metadata
    )
    values (
      p_user_id,
      p_source_kind,
      p_source_ref,
      null,
      p_source_currency,
      p_source_amount,
      p_airs_rate,
      p_airs_delta,
      p_notes,
      p_metadata
    )
    returning * into v_entry;
  end if;

  return v_entry;
end;
$$;

create or replace function public.airs_apply_ledger_entry_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set airs_balance = coalesce(airs_balance, 0) + new.airs_delta,
      airs_lifetime_earned = coalesce(airs_lifetime_earned, 0) + greatest(new.airs_delta, 0),
      airs_last_ledger_entry_at = new.recorded_at,
      airs_last_ledger_entry_id = new.id
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_airs_apply_ledger_entry_to_user on public.airs_ledger_entries;
create trigger trg_airs_apply_ledger_entry_to_user
after insert on public.airs_ledger_entries
for each row
execute function public.airs_apply_ledger_entry_to_user();

create or replace function public.airs_award_profile_completion_bonus(
  p_user_id uuid,
  p_bonus_amount numeric default 10,
  p_source_ref text default 'profile-completion-bonus',
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  status text,
  ledger_entry_id uuid,
  airs_balance numeric,
  airs_lifetime_earned numeric,
  profile_bonus_awarded_at timestamptz,
  profile_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_entry public.airs_ledger_entries;
  v_event_metadata jsonb;
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  if not public.airs_is_profile_complete(v_user) then
    return query
      select
        false,
        'profile_incomplete',
        null::uuid,
        v_user.airs_balance,
        v_user.airs_lifetime_earned,
        v_user.airs_profile_bonus_awarded_at,
        v_user.airs_profile_completed_at;
    return;
  end if;

  if v_user.airs_profile_completed_at is null then
    update public.users
    set airs_profile_completed_at = timezone('utc', now())
    where id = p_user_id
      and airs_profile_completed_at is null;
  end if;

  insert into public.airs_lifecycle_events (
    user_id,
    event_type,
    metadata
  )
  values (
    p_user_id,
    'profile_completed',
    jsonb_build_object(
      'source', 'profile_bonus',
      'bonusAmount', p_bonus_amount,
      'sourceRef', p_source_ref
    ) || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  if v_user.airs_profile_bonus_awarded_at is not null then
    return query
      select
        false,
        'already_awarded',
        (
          select id
          from public.airs_ledger_entries
          where user_id = p_user_id
            and idempotency_key = p_source_ref
          order by recorded_at desc
          limit 1
        ),
        v_user.airs_balance,
        v_user.airs_lifetime_earned,
        v_user.airs_profile_bonus_awarded_at,
        coalesce(v_user.airs_profile_completed_at, timezone('utc', now()));
    return;
  end if;

  v_entry := public.airs_record_ledger_entry(
    p_user_id,
    'profile_completion_bonus',
    p_bonus_amount,
    p_source_ref,
    p_source_ref,
    'USD',
    null,
    0,
    'Profile completion bonus',
    p_metadata
  );

  update public.users
  set airs_profile_bonus_awarded_at = timezone('utc', now())
  where id = p_user_id
    and airs_profile_bonus_awarded_at is null;

  insert into public.airs_lifecycle_events (
    user_id,
    event_type,
    ledger_entry_id,
    source_kind,
    source_ref,
    metadata
  )
  values (
    p_user_id,
    'profile_bonus_awarded',
    v_entry.id,
    v_entry.source_kind,
    v_entry.source_ref,
    jsonb_build_object(
      'bonusAmount', p_bonus_amount,
      'sourceRef', p_source_ref
    ) || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  return query
    select
      true,
      'awarded',
      v_entry.id,
      u.airs_balance,
      u.airs_lifetime_earned,
      u.airs_profile_bonus_awarded_at,
      u.airs_profile_completed_at
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_record_dashboard_visit(
  p_user_id uuid,
  p_locale text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  locale text,
  first_dashboard_recorded boolean,
  should_send_welcome_email boolean,
  should_award_profile_bonus boolean,
  profile_complete boolean,
  welcome_email_sent_at timestamptz,
  profile_bonus_awarded_at timestamptz,
  profile_completed_at timestamptz,
  airs_balance numeric,
  airs_lifetime_earned numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_first_dashboard boolean;
  v_profile_complete boolean;
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  v_first_dashboard := v_user.airs_first_dashboard_at is null;
  v_profile_complete := public.airs_is_profile_complete(v_user);

  if v_first_dashboard then
    update public.users
    set airs_first_dashboard_at = timezone('utc', now())
    where id = p_user_id
      and airs_first_dashboard_at is null;

    insert into public.airs_lifecycle_events (
      user_id,
      event_type,
      metadata
    )
    values (
      p_user_id,
      'first_dashboard_view',
      jsonb_build_object(
        'locale', p_locale,
        'profileComplete', v_profile_complete
      ) || coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (user_id, event_type) do nothing;
  end if;

  select * into v_user
  from public.users
  where id = p_user_id;

  return query
    select
      v_user.id,
      v_user.email,
      v_user.name,
      p_locale,
      v_first_dashboard,
      v_user.airs_welcome_email_sent_at is null,
      v_profile_complete and v_user.airs_profile_bonus_awarded_at is null,
      v_profile_complete,
      v_user.airs_welcome_email_sent_at,
      v_user.airs_profile_bonus_awarded_at,
      v_user.airs_profile_completed_at,
      v_user.airs_balance,
      v_user.airs_lifetime_earned;
end;
$$;

create or replace function public.airs_mark_welcome_email_sent(
  p_user_id uuid,
  p_locale text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  marked boolean,
  status text,
  welcome_email_sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  if v_user.airs_welcome_email_sent_at is not null then
    return query
      select
        false,
        'already_marked',
        v_user.airs_welcome_email_sent_at;
    return;
  end if;

  update public.users
  set airs_welcome_email_sent_at = timezone('utc', now())
  where id = p_user_id
    and airs_welcome_email_sent_at is null;

  insert into public.airs_lifecycle_events (
    user_id,
    event_type,
    metadata
  )
  values (
    p_user_id,
    'welcome_email_sent',
    jsonb_build_object(
      'locale', p_locale
    ) || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  return query
    select
      true,
      'marked',
      u.airs_welcome_email_sent_at
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_handle_user_profile_completion_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.airs_is_profile_complete(new) then
    if TG_OP = 'INSERT' then
      if new.airs_profile_bonus_awarded_at is null then
        perform public.airs_award_profile_completion_bonus(new.id);
      end if;
    elsif old.airs_profile_bonus_awarded_at is null and new.airs_profile_bonus_awarded_at is null then
      perform public.airs_award_profile_completion_bonus(new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_airs_handle_user_profile_completion_change on public.users;
create trigger trg_airs_handle_user_profile_completion_change
after insert or update of email, email_verified, name
on public.users
for each row
execute function public.airs_handle_user_profile_completion_change();

grant execute on function public.airs_is_profile_complete(public.users) to anon, authenticated;
grant execute on function public.airs_record_ledger_entry(uuid, text, numeric, text, text, text, numeric, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.airs_award_profile_completion_bonus(uuid, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.airs_record_dashboard_visit(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.airs_mark_welcome_email_sent(uuid, text, jsonb) to anon, authenticated;
