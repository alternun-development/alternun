-- Better Auth now writes public.users.id as text UUIDs.
-- AIRS bonus/dashboard RPCs were still defined against uuid arguments, and the
-- profile-completion trigger called the uuid overload directly with new.id.
-- Add text overloads that cast safely so auth inserts and API RPCs keep working.

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
begin
  return query
    select *
    from public.airs_award_profile_completion_bonus(
      p_user_id::uuid,
      p_bonus_amount,
      p_source_ref,
      p_metadata
    );
exception
  when invalid_text_representation then
    raise exception 'AIRS user id % is not a UUID string', p_user_id using errcode = '22P02';
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
begin
  return query
    select *
    from public.airs_record_dashboard_visit(
      p_user_id::uuid,
      p_locale,
      p_metadata
    );
exception
  when invalid_text_representation then
    raise exception 'AIRS user id % is not a UUID string', p_user_id using errcode = '22P02';
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
begin
  return query
    select *
    from public.airs_mark_welcome_email_sent(
      p_user_id::uuid,
      p_locale,
      p_metadata
    );
exception
  when invalid_text_representation then
    raise exception 'AIRS user id % is not a UUID string', p_user_id using errcode = '22P02';
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
begin
  return query
    select *
    from public.airs_get_dashboard_snapshot(
      p_user_id::uuid,
      p_locale,
      p_ledger_limit
    );
exception
  when invalid_text_representation then
    raise exception 'AIRS user id % is not a UUID string', p_user_id using errcode = '22P02';
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

grant execute on function public.airs_award_profile_completion_bonus(text, numeric, text, jsonb) to anon, authenticated;
grant execute on function public.airs_record_dashboard_visit(text, text, jsonb) to anon, authenticated;
grant execute on function public.airs_mark_welcome_email_sent(text, text, jsonb) to anon, authenticated;
grant execute on function public.airs_get_dashboard_snapshot(text, text, integer) to anon, authenticated;
