-- AIRS leaderboard query + referral bonus support.
-- Adds:
--   1. referral_bonus source_kind to the ledger check constraint
--   2. airs_get_leaderboard(p_requesting_user_id, p_limit) RPC
--   3. airs_award_referral_bonus(p_referrer_user_id, p_referred_user_id, p_bonus_amount) RPC

-- ─── 1. Expand source_kind check constraint ───────────────────────────────────

alter table public.airs_ledger_entries
  drop constraint if exists airs_ledger_entries_source_kind_chk;

alter table public.airs_ledger_entries
  add constraint airs_ledger_entries_source_kind_chk check (
    source_kind in (
      'allied_commerce',
      'validated_regenerative_action',
      'compensation',
      'profile_completion_bonus',
      'correction',
      'referral_bonus'
    )
  );

-- ─── 2. Leaderboard RPC ───────────────────────────────────────────────────────
-- Returns top p_limit users by airs_balance plus the requesting user's own entry
-- (even if outside the top list). display_name is anonymized for non-self rows.

create or replace function public.airs_get_leaderboard(
  p_requesting_user_id text,
  p_limit int default 20
)
returns table (
  rank          bigint,
  user_id       text,
  display_name  text,
  airs_balance  numeric,
  airs_lifetime_earned numeric,
  is_me         boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requesting_user_id text := btrim(coalesce(p_requesting_user_id, ''));
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 100));
begin
  return query
    with ranked as (
      select
        row_number() over (order by u.airs_balance desc, u.created_at asc) as rnk,
        u.id::text as uid,
        u.name,
        u.email,
        u.airs_balance,
        u.airs_lifetime_earned
      from public.users u
      where u.airs_balance > 0
    ),
    top_n as (
      select * from ranked where rnk <= v_limit
    ),
    me as (
      select * from ranked where uid = v_requesting_user_id
    ),
    combined as (
      select * from top_n
      union all
      select * from me
      where uid not in (select uid from top_n)
    )
    select
      c.rnk,
      c.uid,
      case
        when c.uid = v_requesting_user_id then
          coalesce(nullif(btrim(c.name), ''), split_part(c.email, '@', 1))
        when c.name is not null and btrim(c.name) <> '' then
          left(btrim(c.name), 1) || repeat('*', greatest(0, length(btrim(c.name)) - 1))
        when c.email is not null then
          left(split_part(c.email, '@', 1), 1) || '***'
        else
          'User #' || c.rnk::text
      end as display_name,
      c.airs_balance,
      c.airs_lifetime_earned,
      c.uid = v_requesting_user_id as is_me
    from combined c
    order by c.rnk asc;
end;
$$;

grant execute on function public.airs_get_leaderboard(text, int) to anon, authenticated;

-- ─── 3. Referral bonus RPC ────────────────────────────────────────────────────
-- Awards p_bonus_amount AIRS to the referrer once per referred user.
-- Idempotency key: referral-bonus:{p_referred_user_id}
-- No-op if the referrer doesn't exist or has already been rewarded for this referral.

create or replace function public.airs_award_referral_bonus(
  p_referrer_user_id text,
  p_referred_user_id text,
  p_bonus_amount numeric default 25
)
returns table (
  awarded       boolean,
  status        text,
  ledger_entry_id uuid,
  airs_balance  numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer    public.users;
  v_idempotency_key text;
  v_entry       public.airs_ledger_entries;
  v_existing_entry_id uuid;
begin
  if btrim(coalesce(p_referrer_user_id, '')) = '' then
    return query select false, 'no_referrer'::text, null::uuid, 0::numeric;
    return;
  end if;

  if btrim(coalesce(p_referred_user_id, '')) = '' then
    return query select false, 'no_referred_user'::text, null::uuid, 0::numeric;
    return;
  end if;

  select * into v_referrer
  from public.users
  where id::text = p_referrer_user_id
  for update;

  if not found then
    return query select false, 'referrer_not_found'::text, null::uuid, 0::numeric;
    return;
  end if;

  v_idempotency_key := 'referral-bonus:' || p_referred_user_id;

  -- Check if already awarded
  select id into v_existing_entry_id
  from public.airs_ledger_entries
  where user_id = v_referrer.id
    and idempotency_key = v_idempotency_key
  limit 1;

  if v_existing_entry_id is not null then
    return query
      select
        false,
        'already_awarded'::text,
        v_existing_entry_id,
        v_referrer.airs_balance;
    return;
  end if;

  v_entry := public.airs_record_ledger_entry(
    v_referrer.id,
    'referral_bonus',
    p_bonus_amount,
    'referral-bonus-' || p_referred_user_id,
    v_idempotency_key,
    'USD',
    null,
    0,
    'Referral bonus for inviting a confirmed user',
    jsonb_build_object(
      'referred_user_id', p_referred_user_id,
      'bonus_type', 'referral'
    )
  );

  return query
    select
      true,
      'awarded'::text,
      v_entry.id,
      u.airs_balance
    from public.users u
    where u.id = v_referrer.id;
end;
$$;

grant execute on function public.airs_award_referral_bonus(text, text, numeric) to anon, authenticated;
