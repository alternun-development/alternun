-- User achievements tracking table
-- Tracks which achievements each user has unlocked and when

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint uq_user_achievement unique (user_id, achievement_key)
);

create index if not exists idx_user_achievements_user_id on public.user_achievements(user_id);
create index if not exists idx_user_achievements_achievement_key on public.user_achievements(achievement_key);

-- RPC: get_user_achievements(p_user_id)
-- Returns all known achievements with unlocked status for a user.
-- account_confirmed → derived from users."emailVerified"
-- first_10_airs     → derived from users.airs_balance >= 10
create or replace function public.get_user_achievements(p_user_id text)
returns table (
  achievement_key text,
  unlocked boolean,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
begin
  select * into v_user from public.users where id = p_user_id;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  -- account_confirmed: check email verification status
  return query select
    'account_confirmed'::text,
    coalesce(v_user."emailVerified", false),
    case when coalesce(v_user."emailVerified", false) then now() else null::timestamptz end;

  -- first_10_airs: check if airs_balance >= 10
  return query select
    'first_10_airs'::text,
    coalesce(v_user.airs_balance, 0) >= 10,
    (select ua.unlocked_at from public.user_achievements ua
       where ua.user_id = p_user_id and ua.achievement_key = 'first_10_airs');
end;
$$;

grant execute on function public.get_user_achievements(text) to anon, authenticated;
