-- Recent activity can be sorted by any of its columns: action (source kind), source, Airs or
-- date, ascending or descending. Sorting happens before paging so every page follows it.
-- Ties keep the newest first. Same filters and payload as before.

begin;

drop function if exists public.airs_get_activity(text, text, int, int, text, text);

create or replace function public.airs_get_activity(
  p_requesting_user_id text,
  p_scope text default 'personal',
  p_page int default 1,
  p_limit int default 10,
  p_search text default null,
  p_source_kind text default null,
  p_sort text default 'date',
  p_direction text default 'desc'
)
returns table (entries jsonb, total_count bigint, page int, page_size int)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope text := case when lower(coalesce(p_scope, 'personal')) = 'global' then 'global' else 'personal' end;
  v_page int := greatest(coalesce(p_page, 1), 1);
  v_limit int := greatest(least(coalesce(p_limit, 10), 50), 1);
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_source_kind text := nullif(btrim(coalesce(p_source_kind, '')), '');
  v_sort text := case
    when lower(coalesce(p_sort, '')) in ('action', 'source', 'airs', 'date') then lower(p_sort)
    else 'date'
  end;
  v_asc boolean := lower(coalesce(p_direction, 'desc')) = 'asc';
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
  ), ordered as (
    select filtered.*, row_number() over (
      order by
        case when v_sort = 'action' and v_asc then filtered.source_kind end asc,
        case when v_sort = 'action' and not v_asc then filtered.source_kind end desc,
        case when v_sort = 'source' and v_asc then lower(coalesce(filtered.source_ref, filtered.source_kind)) end asc,
        case when v_sort = 'source' and not v_asc then lower(coalesce(filtered.source_ref, filtered.source_kind)) end desc,
        case when v_sort = 'airs' and v_asc then filtered.airs_delta end asc,
        case when v_sort = 'airs' and not v_asc then filtered.airs_delta end desc,
        case when v_sort = 'date' and v_asc then filtered.recorded_at end asc,
        filtered.recorded_at desc, filtered.created_at desc, filtered.id desc
    ) as position
    from filtered
  ), paged as (
    select * from ordered
    where position > (v_page - 1) * v_limit and position <= v_page * v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'source_kind', source_kind, 'source_ref', source_ref,
    'idempotency_key', idempotency_key, 'source_currency', source_currency,
    'source_amount', source_amount, 'airs_rate', airs_rate, 'airs_delta', airs_delta,
    'notes', notes, 'metadata', case when v_scope = 'personal' then metadata else '{}'::jsonb end,
    'recorded_at', recorded_at, 'created_at', created_at
  ) order by position), '[]'::jsonb)
  into v_entries from paged;

  return query select v_entries, v_total, v_page, v_limit;
end;
$$;

-- Called only by the API with the service role.
revoke all on function public.airs_get_activity(text, text, int, int, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.airs_get_activity(text, text, int, int, text, text, text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
