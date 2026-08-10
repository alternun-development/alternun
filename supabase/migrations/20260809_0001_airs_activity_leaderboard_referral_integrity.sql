-- AIRS dashboard activity, paginated rankings, and atomic referral rewards.
-- The ledger remains the balance source of truth; this migration only derives
-- read models and records the two-sided referral distribution in one transaction.

create table if not exists public.referral_reward_distributions (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referee_user_id text not null references public.users(id) on delete cascade,
  referrer_user_id text not null references public.users(id) on delete cascade,
  referrer_ledger_entry_id uuid not null references public.airs_ledger_entries(id),
  referee_ledger_entry_id uuid not null references public.airs_ledger_entries(id),
  referrer_airs numeric(18,2) not null check (referrer_airs > 0),
  referee_airs numeric(18,2) not null check (referee_airs > 0),
  distributed_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint referral_reward_distributions_referral_uq unique (referral_id),
  constraint referral_reward_distributions_referee_uq unique (referee_user_id)
);

create index if not exists referral_reward_distributions_referrer_idx
  on public.referral_reward_distributions (referrer_user_id, distributed_at desc);

alter table public.referral_reward_distributions enable row level security;

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
  select * into v_user from public.users where id = p_user_id::text for update;
  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  if v_user.registration_bonus_claimed then
    return query select false, null::uuid, u.airs_balance from public.users u where u.id = p_user_id::text;
    return;
  end if;

  v_idempotency_key := 'registration-bonus-' || p_user_id::text;
  v_entry := public.airs_record_ledger_entry(
    p_user_id,
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

  update public.users set registration_bonus_claimed = true where id = p_user_id::text;
  return query select true, v_entry.id, u.airs_balance from public.users u where u.id = p_user_id::text;
end;
$$;

create or replace function public.airs_distribute_referral_rewards(
  p_referee_user_id text,
  p_bonus_amount numeric default 10
)
returns table (
  distributed boolean,
  status text,
  referrer_ledger_entry_id uuid,
  referee_ledger_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.referrals;
  v_referrer public.users;
  v_referee public.users;
  v_referrer_entry public.airs_ledger_entries;
  v_referee_entry public.airs_ledger_entries;
  v_referrer_id text;
  v_referral_key text;
begin
  select * into v_referral
  from public.referrals
  where user_id = btrim(coalesce(p_referee_user_id, ''))
  for update;

  if not found then
    return query select false, 'referral_not_found', null::uuid, null::uuid;
    return;
  end if;
  if v_referral.confirmed_at is null then
    return query select false, 'pending_confirmation', null::uuid, null::uuid;
    return;
  end if;

  v_referrer_id := nullif(btrim(coalesce(v_referral.referrer_user_id, '')), '');
  if v_referrer_id is null then
    return query select false, 'no_referrer', null::uuid, null::uuid;
    return;
  end if;
  if v_referrer_id = v_referral.user_id then
    return query select false, 'self_referral', null::uuid, null::uuid;
    return;
  end if;
  if v_referrer_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     or v_referral.user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return query select false, 'invalid_user_id', null::uuid, null::uuid;
    return;
  end if;

  -- Always lock both users in the same order before inserting either ledger row.
  perform 1 from public.users
  where id = any(array[v_referrer_id, v_referral.user_id])
  order by id
  for update;

  select * into v_referrer from public.users where id = v_referrer_id;
  select * into v_referee from public.users where id = v_referral.user_id;
  if v_referrer.id is null or v_referee.id is null then
    return query select false, 'user_not_found', null::uuid, null::uuid;
    return;
  end if;

  v_referral_key := 'referral-reward:' || v_referral.id::text;

  select * into v_referrer_entry from public.airs_ledger_entries
  where user_id = v_referrer.id::uuid
    and idempotency_key in (v_referral_key || ':referrer', 'referral-bonus:' || v_referee.id)
  order by recorded_at desc limit 1;
  if v_referrer_entry.id is null then
    v_referrer_entry := public.airs_record_ledger_entry(
      v_referrer.id::uuid, 'referral_bonus', p_bonus_amount,
      v_referral_key || ':referrer', v_referral_key || ':referrer', 'USD', null, 0,
      'Referral reward for inviting a confirmed user',
      jsonb_build_object('referral_id', v_referral.id, 'counterparty_user_id', v_referee.id, 'role', 'referrer')
    );
  end if;

  select * into v_referee_entry from public.airs_ledger_entries
  where user_id = v_referee.id::uuid
    and idempotency_key in (v_referral_key || ':referee', 'referee-signup-bonus:' || v_referee.id)
  order by recorded_at desc limit 1;
  if v_referee_entry.id is null then
    v_referee_entry := public.airs_record_ledger_entry(
      v_referee.id::uuid, 'referral_bonus', p_bonus_amount,
      v_referral_key || ':referee', v_referral_key || ':referee', 'USD', null, 0,
      'Referral reward for joining through a confirmed invitation',
      jsonb_build_object('referral_id', v_referral.id, 'counterparty_user_id', v_referrer.id, 'role', 'referee')
    );
  end if;

  insert into public.referral_reward_distributions (
    referral_id, referee_user_id, referrer_user_id, referrer_ledger_entry_id,
    referee_ledger_entry_id, referrer_airs, referee_airs, metadata
  ) values (
    v_referral.id, v_referee.id, v_referrer.id, v_referrer_entry.id,
    v_referee_entry.id, v_referrer_entry.airs_delta, v_referee_entry.airs_delta,
    jsonb_build_object('bonusAmount', p_bonus_amount, 'confirmedAt', v_referral.confirmed_at)
  ) on conflict (referral_id) do update
    set referrer_ledger_entry_id = excluded.referrer_ledger_entry_id,
        referee_ledger_entry_id = excluded.referee_ledger_entry_id,
        metadata = public.referral_reward_distributions.metadata || excluded.metadata;

  return query select true, 'distributed', v_referrer_entry.id, v_referee_entry.id;
end;
$$;

create or replace function public.airs_distribute_referral_rewards_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.confirmed_at is not null and nullif(btrim(coalesce(new.referrer_user_id, '')), '') is not null then
    perform public.airs_distribute_referral_rewards(new.user_id, 10);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_airs_distribute_referral_rewards on public.referrals;
create trigger trg_airs_distribute_referral_rewards
after insert or update of confirmed_at, referrer_user_id on public.referrals
for each row execute function public.airs_distribute_referral_rewards_on_confirmation();

do $$
declare v_referee_user_id text;
begin
  for v_referee_user_id in
    select user_id from public.referrals
    where confirmed_at is not null and nullif(btrim(coalesce(referrer_user_id, '')), '') is not null
  loop
    perform public.airs_distribute_referral_rewards(v_referee_user_id, 10);
  end loop;
end;
$$;

create or replace function public.airs_get_leaderboard_page(
  p_requesting_user_id text,
  p_limit int default 7,
  p_page int default 1
)
returns table (
  rank bigint,
  user_id text,
  display_name text,
  airs_balance numeric,
  airs_lifetime_earned numeric,
  is_me boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (order by u.airs_balance desc, u.created_at asc) as rank,
      u.id::text as user_id,
      u.name,
      u.email,
      u.airs_balance,
      u.airs_lifetime_earned
    from public.users u
    where u.airs_balance > 0
  )
  select
    r.rank,
    r.user_id,
    case
      when r.user_id = btrim(coalesce(p_requesting_user_id, '')) then coalesce(nullif(btrim(r.name), ''), split_part(r.email, '@', 1))
      when r.name is not null and btrim(r.name) <> '' then left(btrim(r.name), 1) || repeat('*', greatest(0, length(btrim(r.name)) - 1))
      when r.email is not null then left(split_part(r.email, '@', 1), 1) || '***'
      else 'User #' || r.rank::text
    end,
    r.airs_balance,
    r.airs_lifetime_earned,
    r.user_id = btrim(coalesce(p_requesting_user_id, ''))
  from ranked r
  order by r.rank
  offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(least(coalesce(p_limit, 7), 50), 1)
  limit greatest(least(coalesce(p_limit, 7), 50), 1);
$$;

create or replace function public.airs_get_activity(
  p_requesting_user_id text,
  p_scope text default 'personal',
  p_page int default 1,
  p_limit int default 10,
  p_search text default null,
  p_source_kind text default null
)
returns table (entries jsonb, total_count bigint, page int, page_size int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := case when lower(coalesce(p_scope, 'personal')) = 'global' then 'global' else 'personal' end;
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_limit int := greatest(least(coalesce(p_limit, 10), 50), 1);
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_source_kind text := nullif(btrim(coalesce(p_source_kind, '')), '');
  v_total bigint;
  v_entries jsonb;
begin
  with filtered as (
    select e.*
    from public.airs_ledger_entries e
    where (v_scope = 'global' or e.user_id::text = btrim(coalesce(p_requesting_user_id, '')))
      and (v_source_kind is null or e.source_kind = v_source_kind)
      and (
        v_search is null
        or lower(coalesce(e.source_ref, '') || ' ' || coalesce(e.notes, '') || ' ' || e.source_kind) like '%' || v_search || '%'
      )
  )
  select count(*) into v_total from filtered;

  with filtered as (
    select e.*
    from public.airs_ledger_entries e
    where (v_scope = 'global' or e.user_id::text = btrim(coalesce(p_requesting_user_id, '')))
      and (v_source_kind is null or e.source_kind = v_source_kind)
      and (
        v_search is null
        or lower(coalesce(e.source_ref, '') || ' ' || coalesce(e.notes, '') || ' ' || e.source_kind) like '%' || v_search || '%'
      )
  ), paged as (
    select * from filtered
    order by recorded_at desc, created_at desc, id desc
    offset (v_page - 1) * v_limit
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'source_kind', source_kind, 'source_ref', source_ref,
    'idempotency_key', idempotency_key, 'source_currency', source_currency,
    'source_amount', source_amount, 'airs_rate', airs_rate, 'airs_delta', airs_delta,
    'notes', notes, 'metadata', case when v_scope = 'personal' then metadata else '{}'::jsonb end,
    'recorded_at', recorded_at, 'created_at', created_at
  ) order by recorded_at desc, created_at desc, id desc), '[]'::jsonb)
  into v_entries from paged;

  return query select v_entries, v_total, v_page, v_limit;
end;
$$;

revoke execute on function public.airs_award_referral_bonus(text, text, numeric) from anon, authenticated;
revoke execute on function public.airs_award_referee_bonus(text, text, numeric) from anon, authenticated;
revoke execute on function public.airs_distribute_referral_rewards(text, numeric) from anon, authenticated;
grant execute on function public.airs_get_leaderboard_page(text, int, int) to anon, authenticated;
grant execute on function public.airs_get_activity(text, text, int, int, text, text) to anon, authenticated;
