-- RBI dashboard card needs the total number of AIRS-eligible users (same
-- eligibility rule as the leaderboard: airs_balance > 0).

create or replace function public.airs_get_eligible_users_count()
returns table (count bigint)
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.users where airs_balance > 0;
$$;
