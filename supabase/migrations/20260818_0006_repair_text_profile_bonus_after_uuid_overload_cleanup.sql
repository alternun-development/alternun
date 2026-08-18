-- The text profile-bonus RPC used to delegate to a UUID overload. That
-- overload was intentionally removed to keep PostgREST RPC resolution
-- unambiguous, leaving social sign-up inserts to fail whenever the new
-- profile is complete. Keep the canonical text RPC self-contained.

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
begin
  select * into v_user
  from public.users
  where id::text = p_user_id
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
    where id::text = p_user_id
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
        coalesce(v_user.airs_profile_completed_at, timezone('utc', now));
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
  where id::text = p_user_id
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
    where u.id::text = p_user_id;
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
        perform public.airs_award_profile_completion_bonus(new.id::text);
      end if;
    elsif old.airs_profile_bonus_awarded_at is null and new.airs_profile_bonus_awarded_at is null then
      perform public.airs_award_profile_completion_bonus(new.id::text);
    end if;
  end if;

  return new;
end;
$$;

grant execute on function public.airs_award_profile_completion_bonus(text, numeric, text, jsonb) to anon, authenticated;
