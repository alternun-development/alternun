-- New user registration bonus: award 10 Airs to each new user
-- Source: Alternun platform

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
begin
  select * into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
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

  return query
    select
      true,
      v_entry.id,
      u.airs_balance
    from public.users u
    where u.id = p_user_id;
end;
$$;

create or replace function public.airs_handle_new_user_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Award 10 Airs bonus to new registered users
  perform public.airs_award_registration_bonus(new.id, 10);
  return new;
end;
$$;

drop trigger if exists trg_airs_handle_new_user_registration on public.users;
create trigger trg_airs_handle_new_user_registration
after insert on public.users
for each row
execute function public.airs_handle_new_user_registration();

grant execute on function public.airs_award_registration_bonus(uuid, numeric) to anon, authenticated;
