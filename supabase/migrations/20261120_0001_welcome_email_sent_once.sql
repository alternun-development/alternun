-- The Airs welcome email goes out once per person.
--
-- In production, airs_mark_welcome_email_sent(text, text, jsonb) was still the old wrapper that
-- calls the uuid overload dropped in 20260626_0004. Every mark failed, the onboarding call failed
-- after the email was sent, and each new sign-in sent the welcome again. This restores the
-- self-contained text version (same as 20260626_0004) and records the people who already got it.

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

-- Already welcomed: by the Better Auth sign-up hook, or by an onboarding call that sent the email
-- and then failed to mark it.
update public.users
set airs_welcome_email_sent_at = coalesce(welcome_email_sent_at, airs_first_dashboard_at, timezone('utc', now()))
where airs_welcome_email_sent_at is null
  and (coalesce(welcome_email_sent, false) or airs_first_dashboard_at is not null);
