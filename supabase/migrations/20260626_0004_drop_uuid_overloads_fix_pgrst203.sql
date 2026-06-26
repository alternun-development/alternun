-- Fix PGRST203: PostgREST cannot disambiguate between text and uuid overloads.
-- All AIRS RPCs called by the API use text user IDs (Better Auth UUIDs as text).
-- Solution: drop uuid overloads, make text overloads self-contained.

-- ─── Drop UUID overloads ──────────────────────────────────────────────────────

drop function if exists public.airs_award_registration_bonus(uuid, numeric);
drop function if exists public.airs_record_dashboard_visit(uuid, text, jsonb);
drop function if exists public.airs_get_dashboard_snapshot(uuid, text, integer);
drop function if exists public.airs_mark_welcome_email_sent(uuid, text, jsonb);
drop function if exists public.airs_award_profile_completion_bonus(uuid, numeric, text, jsonb);

-- ─── Self-contained text overloads ───────────────────────────────────────────
-- Casting p_user_id::uuid only where tables require uuid columns (ledger/events).

create or replace function public.airs_award_registration_bonus(
  p_user_id text,
  p_bonus_amount numeric default 10
)
returns table (
  awarded boolean,
  ledger_entry_id uuid,
  airs_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_entry public.airs_ledger_entries;
  v_idempotency_key text;
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  if v_user.registration_bonus_claimed then
    return query
      select false, null::uuid, u.airs_balance
      from public.users u
      where u.id = p_user_id;
    return;
  end if;

  v_idempotency_key := 'registration-bonus-' || p_user_id;

  v_entry := public.airs_record_ledger_entry(
    p_user_id::uuid,
    'validated_regenerative_action',
    p_bonus_amount,
    'registration-bonus',
    v_idempotency_key,
    'USD',
    null,
    0,
    'Registration welcome bonus',
    jsonb_build_object('source', 'Alternun', 'bonusType', 'registration_welcome')
  );

  update public.users
  set registration_bonus_claimed = true
  where id = p_user_id;

  return query
    select true, v_entry.id, u.airs_balance
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_record_dashboard_visit(
  p_user_id text,
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
#variable_conflict use_column
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

    insert into public.airs_lifecycle_events (user_id, event_type, metadata)
    values (
      p_user_id::uuid,
      'first_dashboard_view',
      jsonb_build_object('locale', p_locale, 'profileComplete', v_profile_complete)
        || coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (user_id, event_type) do nothing;
  end if;

  select * into v_user
  from public.users
  where id = p_user_id;

  return query
    select
      p_user_id::uuid,
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
  p_user_id text,
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
    return query select false, 'already_marked', v_user.airs_welcome_email_sent_at;
    return;
  end if;

  update public.users
  set airs_welcome_email_sent_at = timezone('utc', now())
  where id = p_user_id
    and airs_welcome_email_sent_at is null;

  insert into public.airs_lifecycle_events (user_id, event_type, metadata)
  values (
    p_user_id::uuid,
    'welcome_email_sent',
    jsonb_build_object('locale', p_locale) || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  return query
    select true, 'marked', u.airs_welcome_email_sent_at
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_award_profile_completion_bonus(
  p_user_id text,
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
      select false, 'profile_incomplete', null::uuid,
             v_user.airs_balance, v_user.airs_lifetime_earned,
             v_user.airs_profile_bonus_awarded_at, v_user.airs_profile_completed_at;
    return;
  end if;

  if v_user.airs_profile_completed_at is null then
    update public.users
    set airs_profile_completed_at = timezone('utc', now())
    where id = p_user_id
      and airs_profile_completed_at is null;
  end if;

  insert into public.airs_lifecycle_events (user_id, event_type, metadata)
  values (
    p_user_id::uuid,
    'profile_completed',
    jsonb_build_object('source', 'profile_bonus', 'bonusAmount', p_bonus_amount, 'sourceRef', p_source_ref)
      || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  if v_user.airs_profile_bonus_awarded_at is not null then
    return query
      select false, 'already_awarded',
        (select id from public.airs_ledger_entries
         where user_id = p_user_id::uuid
           and idempotency_key = p_source_ref
         order by recorded_at desc limit 1),
        v_user.airs_balance, v_user.airs_lifetime_earned,
        v_user.airs_profile_bonus_awarded_at,
        coalesce(v_user.airs_profile_completed_at, timezone('utc', now()));
    return;
  end if;

  v_entry := public.airs_record_ledger_entry(
    p_user_id::uuid,
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

  insert into public.airs_lifecycle_events (user_id, event_type, ledger_entry_id, source_kind, source_ref, metadata)
  values (
    p_user_id::uuid,
    'profile_bonus_awarded',
    v_entry.id,
    v_entry.source_kind,
    v_entry.source_ref,
    jsonb_build_object('bonusAmount', p_bonus_amount, 'sourceRef', p_source_ref)
      || coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, event_type) do nothing;

  return query
    select true, 'awarded', v_entry.id, u.airs_balance, u.airs_lifetime_earned,
           u.airs_profile_bonus_awarded_at, u.airs_profile_completed_at
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_get_dashboard_snapshot(
  p_user_id text,
  p_locale text default null,
  p_ledger_limit integer default 5
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  locale text,
  profile_complete boolean,
  first_dashboard_recorded boolean,
  welcome_email_sent_at timestamptz,
  profile_bonus_awarded_at timestamptz,
  profile_completed_at timestamptz,
  airs_balance numeric,
  airs_lifetime_earned numeric,
  recent_ledger_entries jsonb
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
  where id = p_user_id;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  return query
    with recent_entries as (
      select e.id, e.source_kind, e.source_ref, e.idempotency_key,
             e.source_currency, e.source_amount, e.airs_rate, e.airs_delta,
             e.notes, e.metadata, e.recorded_at, e.created_at
      from public.airs_ledger_entries e
      where e.user_id = p_user_id::uuid
      order by e.recorded_at desc, e.created_at desc, e.id desc
      limit greatest(coalesce(p_ledger_limit, 5), 0)
    )
    select
      p_user_id::uuid,
      v_user.email,
      v_user.name,
      p_locale,
      public.airs_is_profile_complete(v_user),
      v_user.airs_first_dashboard_at is not null,
      v_user.airs_welcome_email_sent_at,
      v_user.airs_profile_bonus_awarded_at,
      v_user.airs_profile_completed_at,
      v_user.airs_balance,
      v_user.airs_lifetime_earned,
      coalesce(
        (select jsonb_agg(
          jsonb_build_object(
            'id', l.id, 'source_kind', l.source_kind, 'source_ref', l.source_ref,
            'idempotency_key', l.idempotency_key, 'source_currency', l.source_currency,
            'source_amount', l.source_amount, 'airs_rate', l.airs_rate, 'airs_delta', l.airs_delta,
            'notes', l.notes, 'metadata', l.metadata, 'recorded_at', l.recorded_at, 'created_at', l.created_at
          )
          order by l.recorded_at desc, l.created_at desc, l.id desc
        )
        from recent_entries l),
        '[]'::jsonb
      );
end;
$$;

-- Restore grants
grant execute on function public.airs_award_registration_bonus(text, numeric) to anon, authenticated;
grant execute on function public.airs_record_dashboard_visit(text, text, jsonb) to anon, authenticated;
grant execute on function public.airs_mark_welcome_email_sent(text, text, jsonb) to anon, authenticated;
grant execute on function public.airs_award_profile_completion_bonus(text, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.airs_get_dashboard_snapshot(text, text, integer) to anon, authenticated;
