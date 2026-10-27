-- Verification for 20261030_0001_add_marketplace_sort_order.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back.

begin;

do $$
declare
  v_ids uuid[];
  v_reversed uuid[];
  v_result jsonb;
  v_order uuid[];
  v_audits integer;
  v_error text;
begin
  -- Backfill leaves a dense 0..n-1 order for both tables.
  if exists (
    select 1 from (
      select sort_order, row_number() over (order by sort_order) - 1 as expected
      from public.enterprises
    ) ranked where sort_order <> expected
  ) then
    raise exception 'enterprise backfill is not a dense 0..n-1 order';
  end if;
  if exists (
    select 1 from (
      select sort_order, row_number() over (order by sort_order) - 1 as expected
      from public.projects
    ) ranked where sort_order <> expected
  ) then
    raise exception 'project backfill is not a dense 0..n-1 order';
  end if;

  begin
    update public.enterprises set sort_order = -1
    where id = (select id from public.enterprises limit 1);
    raise exception 'negative sort_order was accepted';
  exception when check_violation then
    null;
  end;

  insert into public.enterprises (
    slug, display_name, status,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    ('order-verification-a', 'Order A', 'active', 'verification', 'seed', 'verification', 'seed'),
    ('order-verification-b', 'Order B', 'active', 'verification', 'seed', 'verification', 'seed');

  select array_agg(id order by sort_order, display_name) into v_ids from public.enterprises;
  select array_agg(id order by ordinality desc) into v_reversed
  from unnest(v_ids) with ordinality id;

  -- Global admin reorders every enterprise; the change is audited.
  v_result := public.marketplace_reorder_enterprises(
    v_reversed, 'verification', 'owner', array['internal_admin'], 'order-ok'
  );
  if v_result ->> 'ok' <> 'true' then
    raise exception 'internal_admin reorder failed: %', v_result;
  end if;
  select array_agg(id order by sort_order) into v_order from public.enterprises;
  if v_order <> v_reversed then
    raise exception 'enterprise order was not applied';
  end if;
  select count(*) into v_audits from public.admin_audit_log
  where request_id = 'order-ok' and action = 'enterprise.reordered' and result = 'allowed';
  if v_audits <> 1 then
    raise exception 'enterprise reorder was not audited';
  end if;

  -- Scoped roles are denied and audited; the order does not change.
  v_result := public.marketplace_reorder_enterprises(
    v_ids, 'verification', 'partner', array['partner_operator'], 'order-denied'
  );
  if v_result ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
    raise exception 'partner_operator reorder was not denied: %', v_result;
  end if;
  select array_agg(id order by sort_order) into v_order from public.enterprises;
  if v_order <> v_reversed then
    raise exception 'denied reorder changed the order';
  end if;
  select count(*) into v_audits from public.admin_audit_log
  where request_id = 'order-denied' and result = 'denied' and reason_code = 'PERMISSION_DENIED';
  if v_audits <> 1 then
    raise exception 'denied reorder was not audited';
  end if;

  -- Incomplete, duplicated, unknown, or null ids are rejected.
  if public.marketplace_reorder_enterprises(
    v_ids[1:cardinality(v_ids) - 1], 'verification', 'owner', array['platform_owner'], 'order-missing'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'a partial list was accepted';
  end if;
  if public.marketplace_reorder_enterprises(
    v_ids[1:cardinality(v_ids) - 1] || v_ids[1], 'verification', 'owner', array['platform_owner'], 'order-dup'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'a duplicated id was accepted';
  end if;
  if public.marketplace_reorder_enterprises(
    v_ids[1:cardinality(v_ids) - 1] || gen_random_uuid(), 'verification', 'owner', array['platform_owner'], 'order-unknown'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'an unknown id was accepted';
  end if;
  if public.marketplace_reorder_enterprises(
    v_ids[1:cardinality(v_ids) - 1] || null::uuid, 'verification', 'owner', array['platform_owner'], 'order-null'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'a null id was accepted';
  end if;
  if public.marketplace_reorder_enterprises(
    v_ids, ' ', 'owner', array['platform_owner'], 'order-actor'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'a blank actor was accepted';
  end if;

  -- Projects follow the same rules.
  insert into public.projects (
    slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    'order-verification-project', 'other', 'en', '{"en":{"title":"Order"}}'::jsonb,
    'verification', 'seed', 'verification', 'seed'
  );
  select array_agg(id order by sort_order desc, id) into v_reversed from public.projects;
  v_result := public.marketplace_reorder_projects(
    v_reversed, 'verification', 'owner', array['platform_owner'], 'project-order-ok'
  );
  select array_agg(id order by sort_order) into v_order from public.projects;
  if v_result ->> 'ok' <> 'true' or v_order <> v_reversed then
    raise exception 'platform_owner project reorder failed: %', v_result;
  end if;
  foreach v_error in array array['moderator', 'sub_admin', 'partner_operator', 'partner_readonly']
  loop
    if public.marketplace_reorder_projects(
      v_reversed, 'verification', v_error, array[v_error], 'project-order-denied'
    ) ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
      raise exception '% reordered projects', v_error;
    end if;
  end loop;
  if public.marketplace_reorder_projects(
    v_reversed[2:], 'verification', 'owner', array['platform_owner'], 'project-order-missing'
  ) ->> 'reasonCode' is distinct from 'SORT_ORDER_INVALID' then
    raise exception 'a partial project list was accepted';
  end if;

  -- Only service_role may execute the functions.
  if has_function_privilege('anon', 'public.marketplace_reorder_enterprises(uuid[], text, text, text[], text)', 'execute')
    or has_function_privilege('authenticated', 'public.marketplace_reorder_projects(uuid[], text, text, text[], text)', 'execute')
    or not has_function_privilege('service_role', 'public.marketplace_reorder_projects(uuid[], text, text, text[], text)', 'execute')
  then
    raise exception 'reorder function grants are wrong';
  end if;
end;
$$;

rollback;
