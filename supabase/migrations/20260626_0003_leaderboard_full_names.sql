-- Show full display names in the leaderboard.
-- Privacy anonymization kept in comments for future opt-in per user.

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
      -- Full name for all users. To re-enable privacy masking in the future:
      -- non-self rows: left(name,1) || repeat('*', length(name)-1)
      coalesce(nullif(btrim(c.name), ''), split_part(c.email, '@', 1), 'User #' || c.rnk::text) as display_name,
      c.airs_balance,
      c.airs_lifetime_earned,
      c.uid = v_requesting_user_id as is_me
    from combined c
    order by c.rnk asc;
end;
$$;

grant execute on function public.airs_get_leaderboard(text, int) to anon, authenticated;
