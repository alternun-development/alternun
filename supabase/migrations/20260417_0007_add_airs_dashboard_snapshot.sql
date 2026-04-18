-- AIRS dashboard snapshot RPC.
-- Returns the current AIRS balance, lifecycle flags, and recent ledger rows for
-- the logged-in user so the mobile dashboard can hydrate from Supabase directly.

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
begin
  select * into v_user
  from public.users
  where id = p_user_id;

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
      v_user.id as user_id,
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

grant execute on function public.airs_get_dashboard_snapshot(uuid, text, integer) to anon, authenticated;
