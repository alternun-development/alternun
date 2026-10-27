-- Issue #249 A3: admin-controlled order for marketplace enterprises and projects.
-- Additive: two columns, a backfill that keeps the current public order, and two
-- audited reorder functions that only global admins can use.

begin;

alter table public.enterprises
  add column if not exists sort_order integer not null default 0;
alter table public.projects
  add column if not exists sort_order integer not null default 0;

alter table public.enterprises
  add constraint enterprises_sort_order_chk check (sort_order >= 0);
alter table public.projects
  add constraint projects_sort_order_chk check (sort_order >= 0);

-- Backfill with the order the API used before this column existed:
-- enterprises by name, projects newest published first.
with ranked as (
  select enterprise.id,
    (row_number() over (order by enterprise.display_name, enterprise.id) - 1)::integer as position
  from public.enterprises enterprise
)
update public.enterprises enterprise
set sort_order = ranked.position
from ranked
where enterprise.id = ranked.id;

with ranked as (
  select project.id,
    (row_number() over (
      order by project.published_at desc nulls last, project.created_at desc, project.id
    ) - 1)::integer as position
  from public.projects project
)
update public.projects project
set sort_order = ranked.position
from ranked
where project.id = ranked.id;

create index if not exists enterprises_sort_order_idx
  on public.enterprises (sort_order, display_name);
create index if not exists projects_sort_order_idx
  on public.projects (sort_order, published_at desc);

-- p_ids must list every enterprise exactly once, in the new order.
create or replace function public.marketplace_reorder_enterprises(
  p_ids uuid[],
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason text;
  v_before jsonb;
  v_after jsonb;
begin
  lock table public.enterprises in share row exclusive mode;

  if not (coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin']) then
    v_reason := 'PERMISSION_DENIED';
  elsif nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_ids is null
    or cardinality(p_ids) = 0
    or array_position(p_ids, null) is not null
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or cardinality(p_ids) <> (select count(*) from public.enterprises)
    or exists (
      select 1
      from unnest(p_ids) requested(id)
      left join public.enterprises enterprise on enterprise.id = requested.id
      where enterprise.id is null
    )
  then
    v_reason := 'SORT_ORDER_INVALID';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type,
      request_id, result, reason_code, metadata
    ) values (
      coalesce(nullif(btrim(p_actor_issuer), ''), 'unknown'),
      coalesce(nullif(btrim(p_actor_subject), ''), 'unknown'),
      coalesce(p_actor_roles, '{}'::text[]),
      'enterprise.reorder_denied', 'enterprise', p_request_id, 'denied', v_reason,
      jsonb_build_object('ids', to_jsonb(p_ids))
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  select coalesce(jsonb_agg(enterprise.id order by enterprise.sort_order, enterprise.display_name), '[]'::jsonb)
    into v_before
  from public.enterprises enterprise;

  update public.enterprises enterprise
  set sort_order = requested.position - 1,
      updated_by_issuer = p_actor_issuer,
      updated_by_subject = p_actor_subject
  from unnest(p_ids) with ordinality requested(id, position)
  where enterprise.id = requested.id
    and enterprise.sort_order is distinct from requested.position - 1;

  select coalesce(jsonb_agg(enterprise.id order by enterprise.sort_order, enterprise.display_name), '[]'::jsonb)
    into v_after
  from public.enterprises enterprise;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type,
    request_id, result, before_state, after_state
  ) values (
    p_actor_issuer, p_actor_subject, p_actor_roles,
    'enterprise.reordered', 'enterprise', p_request_id, 'allowed',
    jsonb_build_object('order', v_before), jsonb_build_object('order', v_after)
  );

  return jsonb_build_object('ok', true, 'order', v_after);
end;
$$;

-- p_ids must list every project exactly once, in the new order.
create or replace function public.marketplace_reorder_projects(
  p_ids uuid[],
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reason text;
  v_before jsonb;
  v_after jsonb;
begin
  lock table public.projects in share row exclusive mode;

  if not (coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin']) then
    v_reason := 'PERMISSION_DENIED';
  elsif nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_ids is null
    or cardinality(p_ids) = 0
    or array_position(p_ids, null) is not null
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or cardinality(p_ids) <> (select count(*) from public.projects)
    or exists (
      select 1
      from unnest(p_ids) requested(id)
      left join public.projects project on project.id = requested.id
      where project.id is null
    )
  then
    v_reason := 'SORT_ORDER_INVALID';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type,
      request_id, result, reason_code, metadata
    ) values (
      coalesce(nullif(btrim(p_actor_issuer), ''), 'unknown'),
      coalesce(nullif(btrim(p_actor_subject), ''), 'unknown'),
      coalesce(p_actor_roles, '{}'::text[]),
      'project.reorder_denied', 'project', p_request_id, 'denied', v_reason,
      jsonb_build_object('ids', to_jsonb(p_ids))
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  select coalesce(jsonb_agg(project.id order by project.sort_order, project.published_at desc), '[]'::jsonb)
    into v_before
  from public.projects project;

  update public.projects project
  set sort_order = requested.position - 1,
      updated_by_issuer = p_actor_issuer,
      updated_by_subject = p_actor_subject
  from unnest(p_ids) with ordinality requested(id, position)
  where project.id = requested.id
    and project.sort_order is distinct from requested.position - 1;

  select coalesce(jsonb_agg(project.id order by project.sort_order, project.published_at desc), '[]'::jsonb)
    into v_after
  from public.projects project;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type,
    request_id, result, before_state, after_state
  ) values (
    p_actor_issuer, p_actor_subject, p_actor_roles,
    'project.reordered', 'project', p_request_id, 'allowed',
    jsonb_build_object('order', v_before), jsonb_build_object('order', v_after)
  );

  return jsonb_build_object('ok', true, 'order', v_after);
end;
$$;

revoke all on function public.marketplace_reorder_enterprises(
  uuid[], text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_reorder_projects(
  uuid[], text, text, text[], text
) from public, anon, authenticated;
grant execute on function public.marketplace_reorder_enterprises(
  uuid[], text, text, text[], text
) to service_role;
grant execute on function public.marketplace_reorder_projects(
  uuid[], text, text, text[], text
) to service_role;

commit;
