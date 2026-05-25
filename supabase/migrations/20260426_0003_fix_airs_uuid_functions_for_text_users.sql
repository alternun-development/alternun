-- AIRS originally queried public.users.id as uuid.
-- Better Auth moved public.users.id to text UUIDs, so AIRS functions must cast
-- only when talking to public.users while keeping uuid types for ledger tables.

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
  v_user_id_text text := p_user_id::text;
begin
  select * into v_user
  from public.users
  where id = v_user_id_text;

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
  v_user_id_text text := p_user_id::text;
begin
  select * into v_user
  from public.users
  where id = v_user_id_text
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
    where id = v_user_id_text
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
  where id = v_user_id_text
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
    where u.id = v_user_id_text;
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
  v_user_id_text text := p_user_id::text;
begin
  select * into v_user
  from public.users
  where id = v_user_id_text
  for update;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  v_first_dashboard := v_user.airs_first_dashboard_at is null;
  v_profile_complete := public.airs_is_profile_complete(v_user);

  if v_first_dashboard then
    update public.users
    set airs_first_dashboard_at = timezone('utc', now())
    where id = v_user_id_text
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
  where id = v_user_id_text;

  return query
    select
      p_user_id,
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
  v_user_id_text text := p_user_id::text;
begin
  select * into v_user
  from public.users
  where id = v_user_id_text
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
  where id = v_user_id_text
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
    where u.id = v_user_id_text;
end;
$$;

create or replace function public.airs_get_dashboard_snapshot(
  p_user_id uuid,
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
  v_user_id_text text := p_user_id::text;
begin
  select * into v_user
  from public.users
  where id = v_user_id_text;

  if not found then
    raise exception 'AIRS user % not found', p_user_id using errcode = 'P0002';
  end if;

  return query
    with recent_ledger_entries as (
      select
        e.id,
        e.source_kind,
        e.source_ref,
        e.idempotency_key,
        e.source_currency,
        e.source_amount,
        e.airs_rate,
        e.airs_delta,
        e.notes,
        e.metadata,
        e.recorded_at,
        e.created_at
      from public.airs_ledger_entries e
      where e.user_id = p_user_id
      order by e.recorded_at desc, e.created_at desc, e.id desc
      limit greatest(coalesce(p_ledger_limit, 5), 0)
    )
    select
      p_user_id as user_id,
      v_user.email,
      v_user.name as display_name,
      p_locale as locale,
      public.airs_is_profile_complete(v_user) as profile_complete,
      v_user.airs_first_dashboard_at is not null as first_dashboard_recorded,
      v_user.airs_welcome_email_sent_at,
      v_user.airs_profile_bonus_awarded_at,
      v_user.airs_profile_completed_at,
      v_user.airs_balance,
      v_user.airs_lifetime_earned,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', l.id,
              'source_kind', l.source_kind,
              'source_ref', l.source_ref,
              'idempotency_key', l.idempotency_key,
              'source_currency', l.source_currency,
              'source_amount', l.source_amount,
              'airs_rate', l.airs_rate,
              'airs_delta', l.airs_delta,
              'notes', l.notes,
              'metadata', l.metadata,
              'recorded_at', l.recorded_at,
              'created_at', l.created_at
            )
            order by l.recorded_at desc, l.created_at desc, l.id desc
          )
          from recent_ledger_entries l
        ),
        '[]'::jsonb
      ) as recent_ledger_entries;
end;
$$;
