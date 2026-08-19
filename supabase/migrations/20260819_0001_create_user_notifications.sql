-- Persistent, user-scoped notifications. Domain triggers below turn meaningful
-- completed actions into durable records; clients only read and mutate their
-- own feed through the authenticated API.

create extension if not exists pgcrypto;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_notifications_event_type_chk check (
    event_type in (
      'registration_completed',
      'airs_credited',
      'referral_confirmed',
      'wallet_connected',
      'profile_completed'
    )
  ),
  constraint user_notifications_severity_chk check (severity in ('success', 'error', 'info', 'warning')),
  constraint user_notifications_dedupe_key_len_chk check (char_length(dedupe_key) between 1 and 256)
);

create unique index if not exists user_notifications_dedupe_uidx
  on public.user_notifications (user_id, dedupe_key);
create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc)
  where deleted_at is null;

alter table public.user_notifications enable row level security;

-- Notifications are accessed via the API's service-role client after it has
-- resolved the caller. No direct client policy is intentionally granted.

create or replace function public.create_user_notification(
  p_user_id text,
  p_event_type text,
  p_severity text,
  p_payload jsonb,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (user_id, event_type, severity, payload, dedupe_key)
  values (
    p_user_id,
    p_event_type,
    p_severity,
    coalesce(p_payload, '{}'::jsonb),
    p_dedupe_key
  )
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

-- Trigger functions execute as their owner. The helper must not be available
-- through PostgREST/RPC because it intentionally bypasses table RLS.
revoke all on function public.create_user_notification(text, text, text, jsonb, text) from public;
revoke all on function public.create_user_notification(text, text, text, jsonb, text) from anon;
revoke all on function public.create_user_notification(text, text, text, jsonb, text) from authenticated;

create or replace function public.notify_user_registered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_user_notification(
    new.id,
    'registration_completed',
    'success',
    jsonb_build_object('email', new.email),
    'registration:' || new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_user_registered on public.users;
create trigger trg_notify_user_registered
after insert on public.users
for each row execute function public.notify_user_registered();

create or replace function public.notify_airs_credited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.airs_delta > 0 then
    perform public.create_user_notification(
      new.user_id::text,
      'airs_credited',
      'success',
      jsonb_build_object(
        'amount', new.airs_delta,
        'source_kind', new.source_kind,
        'source_ref', new.source_ref
      ),
      'airs-ledger:' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_airs_credited on public.airs_ledger_entries;
create trigger trg_notify_airs_credited
after insert on public.airs_ledger_entries
for each row execute function public.notify_airs_credited();

create or replace function public.notify_referral_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.confirmed_at is not null
    and (tg_op = 'INSERT' or old.confirmed_at is null)
    and nullif(btrim(coalesce(new.referrer_user_id, '')), '') is not null then
    perform public.create_user_notification(
      new.referrer_user_id,
      'referral_confirmed',
      'success',
      jsonb_build_object('referral_id', new.id),
      'referral-confirmed:' || new.user_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_referral_confirmed on public.referrals;
create trigger trg_notify_referral_confirmed
after insert or update of confirmed_at on public.referrals
for each row execute function public.notify_referral_confirmed();

create or replace function public.notify_wallet_connected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id text;
begin
  -- `app_user_id` exists in newer wallet schemas; read it through JSON so this
  -- trigger stays compatible with older deployed wallet rows. Fall back to the
  -- wallet owner only when it is also an application user.
  v_user_id := coalesce(nullif(to_jsonb(new) ->> 'app_user_id', ''), new.user_id::text);

  if exists (select 1 from public.users where id = v_user_id) then
    perform public.create_user_notification(
      v_user_id,
      'wallet_connected',
      'info',
      jsonb_build_object('chain', new.chain, 'provider', new.wallet_provider),
      'wallet-connected:' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_wallet_connected on public.user_wallets;
create trigger trg_notify_wallet_connected
after insert on public.user_wallets
for each row execute function public.notify_wallet_connected();

create or replace function public.notify_profile_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'profile_completed' then
    perform public.create_user_notification(
      new.user_id::text,
      'profile_completed',
      'success',
      '{}'::jsonb,
      'profile-completed:' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_profile_completed on public.airs_lifecycle_events;
create trigger trg_notify_profile_completed
after insert on public.airs_lifecycle_events
for each row execute function public.notify_profile_completed();
