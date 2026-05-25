-- Match the partial unique index on public.airs_ledger_entries(user_id, idempotency_key)
-- so profile-bonus upserts can reuse existing ledger rows safely.

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
    on conflict (user_id, idempotency_key) where idempotency_key is not null do update
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
