-- Fix: airs_record_dashboard_visit RETURNS TABLE declares 'user_id' as an implicit
-- PL/pgSQL variable, making bare 'user_id' references in INSERT/ON CONFLICT ambiguous.
-- Add #variable_conflict use_column to prefer table column interpretation.

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

grant execute on function public.airs_record_dashboard_visit(text, text, jsonb) to anon, authenticated;
