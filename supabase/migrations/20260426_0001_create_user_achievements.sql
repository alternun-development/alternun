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
-- account_confirmed → derived from users.email_verified
-- first_10_airs     → derived from users.airs_balance >= 10
-- first_50_airs     → derived from users.airs_balance >= 50
-- first_100_airs    → derived from users.airs_balance >= 100
-- Other achievements are manually tracked via user_achievements table
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
  v_achievement_list text[] := array[
    'account_confirmed',
    'first_10_airs',
    'fifty_airs',
    'first_100_airs',
    'first_regenerative_action',
    'five_regenerative_actions',
    'first_commerce_action',
    'profile_complete',
    'bio_added',
    'avatar_uploaded',
    'wallet_connected',
    'seven_day_streak',
    'referral_invited',
    'ambassador'
  ];
  v_key text;
  v_unlocked boolean;
  v_unlocked_at timestamptz;
begin
  select * into v_user from public.users where id = p_user_id;

  if not found then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  foreach v_key in array v_achievement_list loop
    v_unlocked := false;
    v_unlocked_at := null;

    case v_key
      when 'account_confirmed' then
        v_unlocked := coalesce(v_user.email_verified, false);
        if v_unlocked then v_unlocked_at := now(); end if;
      when 'first_10_airs' then
        v_unlocked := coalesce(v_user.airs_balance, 0) >= 10;
        v_unlocked_at := (select ua.unlocked_at from public.user_achievements ua
          where ua.user_id = p_user_id and ua.achievement_key = 'first_10_airs' limit 1);
      when 'fifty_airs' then
        v_unlocked := coalesce(v_user.airs_balance, 0) >= 50;
        v_unlocked_at := (select ua.unlocked_at from public.user_achievements ua
          where ua.user_id = p_user_id and ua.achievement_key = 'fifty_airs' limit 1);
      when 'first_100_airs' then
        v_unlocked := coalesce(v_user.airs_balance, 0) >= 100;
        v_unlocked_at := (select ua.unlocked_at from public.user_achievements ua
          where ua.user_id = p_user_id and ua.achievement_key = 'first_100_airs' limit 1);
      else
        -- Check user_achievements table for manually tracked achievements
        select ua.unlocked_at into v_unlocked_at from public.user_achievements ua
          where ua.user_id = p_user_id and ua.achievement_key = v_key limit 1;
        v_unlocked := v_unlocked_at is not null;
    end case;

    return query select v_key, v_unlocked, v_unlocked_at;
  end loop;
end;
$$;

grant execute on function public.get_user_achievements(text) to anon, authenticated;
