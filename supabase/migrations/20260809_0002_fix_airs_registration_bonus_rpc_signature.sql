-- PostgREST cannot resolve overloaded RPC signatures from JSON parameters.
-- The API authenticates user ids as text, so retain the text signature only.

drop function if exists public.airs_award_registration_bonus(uuid, numeric);

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
  select * into v_user from public.users where id = btrim(coalesce(p_user_id, '')) for update;
  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  if v_user.registration_bonus_claimed then
    return query select false, null::uuid, v_user.airs_balance;
    return;
  end if;

  v_idempotency_key := 'registration-bonus-' || v_user.id;
  v_entry := public.airs_record_ledger_entry(
    v_user.id::uuid,
    'compensation',
    p_bonus_amount,
    'registration-bonus',
    v_idempotency_key,
    'USD',
    null,
    0,
    'First environmental impact points',
    jsonb_build_object('source', 'Alternun', 'bonusType', 'first_environmental_impact')
  );

  update public.users set registration_bonus_claimed = true where id = v_user.id;
  return query select true, v_entry.id, u.airs_balance from public.users u where u.id = v_user.id;
end;
$$;

grant execute on function public.airs_award_registration_bonus(text, numeric) to anon, authenticated;
