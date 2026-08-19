-- Public-facing aggregate, served only through the API service-role boundary.
-- It deliberately sums positive ledger entries: it represents all AIRS earned
-- by the community, independent of later balance corrections or redemptions.

create or replace function public.airs_get_community_total()
returns table(total_airs numeric, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(airs_delta) filter (where airs_delta > 0), 0)::numeric as total_airs,
    max(recorded_at) as updated_at
  from public.airs_ledger_entries;
$$;

revoke all on function public.airs_get_community_total() from public;
grant execute on function public.airs_get_community_total() to service_role;
