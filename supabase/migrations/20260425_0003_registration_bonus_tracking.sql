-- Add registration bonus tracking flag
-- Tracks whether the registration bonus (10 Airs) has been claimed by each user

alter table public.users add column if not exists registration_bonus_claimed boolean default false;

-- Update the registration bonus function to properly track claimed status
create or replace function public.airs_award_registration_bonus(
  p_user_id uuid,
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
  v_awarded boolean := false;
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  -- Check if bonus was already claimed
  if v_user.registration_bonus_claimed then
    return query
      select
        false,
        null::uuid,
        u.airs_balance
      from public.users u
      where u.id = p_user_id;
    return;
  end if;

  -- Use registration-bonus-{user_id} as idempotency key to ensure single award
  v_idempotency_key := 'registration-bonus-' || p_user_id::text;

  v_entry := public.airs_record_ledger_entry(
    p_user_id,
    'validated_regenerative_action',
    p_bonus_amount,
    'registration-bonus',
    v_idempotency_key,
    'USD',
    null,
    0,
    'Registration welcome bonus',
    jsonb_build_object(
      'source', 'Alternun',
      'bonusType', 'registration_welcome'
    )
  );

  -- Mark bonus as claimed
  update public.users
  set registration_bonus_claimed = true
  where id = p_user_id;

  return query
    select
      true,
      v_entry.id,
      u.airs_balance
    from public.users u
    where u.id = p_user_id;
end;
$$;

grant execute on function public.airs_award_registration_bonus(uuid, numeric) to anon, authenticated;
