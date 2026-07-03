-- Award AIRS signup bonus to the referee (the user who signed up via a referral code).
-- Complements airs_award_referral_bonus which awards the referrer.
--
-- Idempotency key: referee-signup-bonus:{p_referee_user_id}
-- No-op if the referee doesn't exist or has already received this bonus.

create or replace function public.airs_award_referee_bonus(
  p_referee_user_id  text,
  p_referrer_user_id text,
  p_bonus_amount     numeric default 25
)
returns table (
  awarded          boolean,
  status           text,
  ledger_entry_id  uuid,
  airs_balance     numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referee           public.users;
  v_idempotency_key   text;
  v_entry             public.airs_ledger_entries;
  v_existing_entry_id uuid;
begin
  if btrim(coalesce(p_referee_user_id, '')) = '' then
    return query select false, 'no_referee'::text, null::uuid, 0::numeric;
    return;
  end if;

  select * into v_referee
  from public.users
  where id::text = p_referee_user_id
  for update;

  if not found then
    return query select false, 'referee_not_found'::text, null::uuid, 0::numeric;
    return;
  end if;

  v_idempotency_key := 'referee-signup-bonus:' || p_referee_user_id;

  select id into v_existing_entry_id
  from public.airs_ledger_entries
  where user_id = v_referee.id
    and idempotency_key = v_idempotency_key
  limit 1;

  if v_existing_entry_id is not null then
    return query
      select false, 'already_awarded'::text, v_existing_entry_id, v_referee.airs_balance;
    return;
  end if;

  v_entry := public.airs_record_ledger_entry(
    v_referee.id,
    'referral_bonus',
    p_bonus_amount,
    'referee-signup-bonus-' || p_referee_user_id,
    v_idempotency_key,
    'USD',
    null,
    0,
    'Signup bonus for joining via a referral',
    jsonb_build_object(
      'referrer_user_id', p_referrer_user_id,
      'bonus_type', 'referee_signup'
    )
  );

  return query
    select
      true,
      'awarded'::text,
      v_entry.id,
      u.airs_balance
    from public.users u
    where u.id = v_referee.id;
end;
$$;

grant execute on function public.airs_award_referee_bonus(text, text, numeric) to anon, authenticated;
