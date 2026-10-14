-- Verification for issue #249 marketplace migrations.
-- Run after 0001 through 0004. Catalog queries are read-only; behavioral
-- assertions run in a transaction that is always rolled back.

-- Edward: record this result independently in testnet and production before a
-- later migration adds any FK to public.users(id).
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  character_maximum_length
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name = 'id';

-- Also confirm that the current AIRS ledger user reference matches the users
-- ID in each environment.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'airs_ledger_entries'
  and column_name = 'user_id';

with marketplace_tables(table_name) as (
  values
    ('project_categories'),
    ('enterprises'),
    ('projects'),
    ('enterprise_projects'),
    ('project_media_allowed_hosts'),
    ('project_media'),
    ('admin_audit_log'),
    ('project_memberships'),
    ('project_activities'),
    ('project_activity_completions')
), roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), privileges(privilege_name) as (
  values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')
)
select
  roles.role_name,
  marketplace_tables.table_name,
  privileges.privilege_name,
  has_table_privilege(
    roles.role_name,
    format('public.%I', marketplace_tables.table_name),
    privileges.privilege_name
  ) as actual,
  case
    when roles.role_name = 'service_role'
      and marketplace_tables.table_name = 'admin_audit_log'
      and privileges.privilege_name in ('UPDATE', 'DELETE')
      then false
    when roles.role_name = 'service_role' then true
    else false
  end as expected,
  has_table_privilege(
    roles.role_name,
    format('public.%I', marketplace_tables.table_name),
    privileges.privilege_name
  ) = case
    when roles.role_name = 'service_role'
      and marketplace_tables.table_name = 'admin_audit_log'
      and privileges.privilege_name in ('UPDATE', 'DELETE')
      then false
    when roles.role_name = 'service_role' then true
    else false
  end as passes
from marketplace_tables
cross join roles
cross join privileges
order by marketplace_tables.table_name, roles.role_name, privileges.privilege_name;

-- RLS must be enabled and there must be no client policy on any new table.
with marketplace_tables(table_name) as (
  values
    ('project_categories'),
    ('enterprises'),
    ('projects'),
    ('enterprise_projects'),
    ('project_media_allowed_hosts'),
    ('project_media'),
    ('admin_audit_log'),
    ('project_memberships'),
    ('project_activities'),
    ('project_activity_completions')
)
select
  marketplace_tables.table_name,
  catalog.relrowsecurity as rls_enabled,
  count(policy.policyname) as policy_count,
  catalog.relrowsecurity and count(policy.policyname) = 0 as passes
from marketplace_tables
join pg_catalog.pg_class catalog
  on catalog.relname = marketplace_tables.table_name
join pg_catalog.pg_namespace namespace
  on namespace.oid = catalog.relnamespace
  and namespace.nspname = 'public'
left join pg_catalog.pg_policies policy
  on policy.schemaname = 'public'
  and policy.tablename = marketplace_tables.table_name
group by marketplace_tables.table_name, catalog.relrowsecurity
order by marketplace_tables.table_name;

-- Every new function must have a fixed search_path and service-role-only
-- execution. SECURITY DEFINER is expected only for atomic RPCs.
with marketplace_function(signature, expected_security_definer) as (
  values
    ('public.marketplace_set_updated_at()', false),
    ('public.marketplace_validate_project_media()', false),
    ('public.marketplace_protect_published_project_slug()', false),
    ('public.marketplace_grant_project_membership(text,text,text,uuid,uuid,text,text,text,text,text[],text,text)', true),
    ('public.marketplace_change_project_membership(uuid,text,text,text,text,text[],text,text)', true),
    ('public.marketplace_transition_project_status(uuid,text,text,text,text[],text,text)', true),
    ('public.marketplace_approve_activity_completion(uuid,text,text,text[],text,text)', true),
    ('public.marketplace_reverse_activity_completion(uuid,text,text,text[],text,text)', true),
    ('public.marketplace_actor_has_scope(text,text,text[],uuid,uuid,text[])', true),
    ('public.marketplace_create_project(uuid,text,text,text,text,text,jsonb,text,text,text[],text)', true),
    ('public.marketplace_update_project(uuid,jsonb,text,text,text[],text)', true),
    ('public.marketplace_reorder_project_media(uuid,jsonb,text,text,text[],text)', true),
    ('public.marketplace_set_enterprise_status(uuid,text,text,text,text[],text,text)', true)
)
select
  marketplace_function.signature,
  procedure.prosecdef as security_definer,
  marketplace_function.expected_security_definer,
  procedure.proconfig,
  has_function_privilege('anon', marketplace_function.signature, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', marketplace_function.signature, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', marketplace_function.signature, 'EXECUTE') as service_role_can_execute,
  procedure.prosecdef = marketplace_function.expected_security_definer
    and procedure.proconfig @> array['search_path=pg_catalog, public']
    and not has_function_privilege('anon', marketplace_function.signature, 'EXECUTE')
    and not has_function_privilege('authenticated', marketplace_function.signature, 'EXECUTE')
    and has_function_privilege('service_role', marketplace_function.signature, 'EXECUTE') as passes
from marketplace_function
join pg_catalog.pg_proc procedure
  on procedure.oid = to_regprocedure(marketplace_function.signature)
order by marketplace_function.signature;

-- No migration currently creates a sequence. If a future revision adds one,
-- every returned row must be false/false/true for USAGE.
with marketplace_table_oids as (
  select catalog.oid
  from pg_catalog.pg_class catalog
  join pg_catalog.pg_namespace namespace on namespace.oid = catalog.relnamespace
  where namespace.nspname = 'public'
    and catalog.relname in (
      'project_categories',
      'enterprises',
      'projects',
      'enterprise_projects',
      'project_media_allowed_hosts',
      'project_media',
      'admin_audit_log',
      'project_memberships',
      'project_activities',
      'project_activity_completions'
    )
)
select
  namespace.nspname as sequence_schema,
  sequence.relname as sequence_name,
  has_sequence_privilege('anon', sequence.oid, 'USAGE') as anon_can_use,
  has_sequence_privilege('authenticated', sequence.oid, 'USAGE') as authenticated_can_use,
  has_sequence_privilege('service_role', sequence.oid, 'USAGE') as service_role_can_use
from pg_catalog.pg_depend dependency
join marketplace_table_oids on marketplace_table_oids.oid = dependency.refobjid
join pg_catalog.pg_class sequence
  on sequence.oid = dependency.objid
  and sequence.relkind = 'S'
join pg_catalog.pg_namespace namespace on namespace.oid = sequence.relnamespace
where dependency.deptype = 'a'
order by namespace.nspname, sequence.relname;

-- Behavioral assertions. Fixed fixture IDs are isolated by the final rollback.
begin;

do $$
declare
  v_result jsonb;
  v_project_id uuid;
  v_membership_id uuid;
  v_content jsonb := '{
    "es": {
      "title": "Proyecto de verificacion",
      "location": "Bogota",
      "theme": "Ecoturismo",
      "description": "Contenido completo para verificar las mutaciones atomicas.",
      "waysToContribute": ["Participar"]
    }
  }'::jsonb;
  v_enterprise_id constant uuid := '24999999-0000-4000-8000-000000000001';
  v_media_one constant uuid := '24999999-0000-4000-8000-000000000002';
  v_media_two constant uuid := '24999999-0000-4000-8000-000000000003';
  v_missing_id constant uuid := '24999999-0000-4000-8000-000000000099';
begin
  insert into public.enterprises (
    id, slug, display_name, status, country_code,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'verification-enterprise', 'Verification Enterprise',
    'active', 'CO', 'verification', 'actor', 'verification', 'actor'
  );

  -- NULL membership inputs return structured denials and never constraints/FKs.
  v_result := public.marketplace_grant_project_membership(
    'verification', 'member-scope-null', null, v_enterprise_id, null, null,
    'sub_admin', 'verification', 'actor', array['platform_owner'],
    'verification-scope-null', null
  );
  if v_result ->> 'reasonCode' is distinct from 'MEMBERSHIP_INPUT_INVALID' then
    raise exception 'scope NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_grant_project_membership(
    'verification', 'member-role-null', null, v_enterprise_id, null,
    'enterprise', null, 'verification', 'actor', array['platform_owner'],
    'verification-role-null', null
  );
  if v_result ->> 'reasonCode' is distinct from 'MEMBERSHIP_INPUT_INVALID' then
    raise exception 'role NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_grant_project_membership(
    'verification', 'member-enterprise-missing', null, v_missing_id, null,
    'enterprise', 'sub_admin', 'verification', 'actor',
    array['platform_owner'], 'verification-enterprise-missing', null
  );
  if v_result ->> 'reasonCode' is distinct from 'ENTERPRISE_NOT_FOUND' then
    raise exception 'missing enterprise assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_grant_project_membership(
    'verification', 'member-project-missing', null, v_enterprise_id,
    v_missing_id, 'project', 'sub_admin', 'verification', 'actor',
    array['platform_owner'], 'verification-project-missing', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_NOT_FOUND' then
    raise exception 'missing project assertion failed: %', v_result;
  end if;

  insert into public.project_memberships (
    member_issuer, member_subject, enterprise_id, scope_type, role, status,
    granted_by_issuer, granted_by_subject
  ) values (
    'verification', 'member-change', v_enterprise_id, 'enterprise',
    'sub_admin', 'active', 'verification', 'actor'
  ) returning id into v_membership_id;

  v_result := public.marketplace_change_project_membership(
    v_membership_id, null, 'active', 'verification', 'actor',
    array['platform_owner'], 'verification-change-role-null', null
  );
  if v_result ->> 'reasonCode' is distinct from 'MEMBERSHIP_INPUT_INVALID' then
    raise exception 'new role NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_transition_project_status(
    '24900000-0000-4000-8000-000000000002', null, 'verification', 'actor',
    array['platform_owner'], 'verification-status-null', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_STATUS_TRANSITION_INVALID' then
    raise exception 'target status NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_transition_project_status(
    v_missing_id, 'published', 'verification', 'actor',
    array['platform_owner'], 'verification-project-not-found', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_NOT_FOUND' then
    raise exception 'transition missing project assertion failed: %', v_result;
  end if;

  -- The scope helper treats every NULL-bearing identity/role input as false.
  if public.marketplace_actor_has_scope(
    'verification', 'actor', array['platform_owner'], v_enterprise_id, null,
    array['partner_operator']
  ) is not true then
    raise exception 'global scope assertion failed';
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'actor', array['platform_owner', null], v_enterprise_id,
    null, array['partner_operator']
  ) is not false then
    raise exception 'NULL scope assertion failed';
  end if;

  v_result := public.marketplace_create_project(
    v_enterprise_id, 'verification-project', 'hospitality_ecotourism', 'CO',
    'America/Bogota', 'es', v_content, 'verification', 'actor',
    array['platform_owner'], 'verification-create-project'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'create project assertion failed: %', v_result;
  end if;
  v_project_id := (v_result -> 'project' ->> 'id')::uuid;
  if not exists (
    select 1 from public.enterprise_projects relation
    where relation.enterprise_id = v_enterprise_id
      and relation.project_id = v_project_id
      and relation.relation = 'owner'
      and relation.is_primary
  ) then
    raise exception 'primary enterprise relation assertion failed';
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'member-change', array['sub_admin'], v_enterprise_id,
    v_project_id, array['sub_admin']
  ) is not true then
    raise exception 'enterprise membership project coverage assertion failed';
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'member-change', array['sub_admin'], v_enterprise_id,
    v_missing_id, array['sub_admin']
  ) is not false then
    raise exception 'cross-project scope assertion failed';
  end if;

  v_result := public.marketplace_update_project(
    v_project_id, '{"content":{"es":{"title":"Proyecto actualizado","location":"Bogota","theme":"Ecoturismo","description":"Contenido actualizado y completo.","waysToContribute":["Participar"]}}}'::jsonb,
    'verification', 'actor', array['platform_owner'], 'verification-update-project'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'update project assertion failed: %', v_result;
  end if;

  -- Malformed JSON must produce a clean denial, never a JSON iterator error.
  v_result := public.marketplace_update_project(
    v_project_id, '[]'::jsonb, 'verification', 'actor',
    array['platform_owner'], 'verification-update-malformed'
  );
  if v_result ->> 'reasonCode' is distinct from 'VALIDATION_FAILED' then
    raise exception 'malformed patch assertion failed: %', v_result;
  end if;
  v_result := public.marketplace_reorder_project_media(
    v_project_id, '{}'::jsonb, 'verification', 'actor',
    array['platform_owner'], 'verification-reorder-malformed'
  );
  if v_result ->> 'reasonCode' is distinct from 'MEDIA_ORDER_INVALID' then
    raise exception 'malformed media order assertion failed: %', v_result;
  end if;

  insert into public.project_media_allowed_hosts (media_kind, host)
  values ('gallery_image', 'images.test')
  on conflict do nothing;
  insert into public.project_media (
    id, project_id, kind, url, alt_text, caption, sort_order,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    (v_media_one, v_project_id, 'gallery_image', 'https://images.test/one.jpg',
      '{"es":"Uno"}', '{}', 0, 'verification', 'actor', 'verification', 'actor'),
    (v_media_two, v_project_id, 'gallery_image', 'https://images.test/two.jpg',
      '{"es":"Dos"}', '{}', 1, 'verification', 'actor', 'verification', 'actor');

  v_result := public.marketplace_reorder_project_media(
    v_project_id,
    jsonb_build_array(
      jsonb_build_object('id', v_media_one, 'sortOrder', 1),
      jsonb_build_object('id', v_media_two, 'sortOrder', 0)
    ),
    'verification', 'actor', array['platform_owner'], 'verification-reorder'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'reorder media assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_transition_project_status(
    v_project_id, 'published', 'verification', 'actor',
    array['platform_owner'], 'verification-publish', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'publish assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_update_project(
    v_project_id, '{"slug":"verification-project-renamed"}'::jsonb,
    'verification', 'actor', array['platform_owner'], 'verification-slug'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SLUG_IMMUTABLE' then
    raise exception 'immutable slug assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_set_enterprise_status(
    v_enterprise_id, 'paused', 'verification', 'actor',
    array['platform_owner'], 'verification-pause-enterprise', 'verification'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or (v_result ->> 'publishedProjectCount')::integer is distinct from 1
    or (select status from public.projects where id = v_project_id) is distinct from 'published'
  then
    raise exception 'enterprise no-cascade assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_create_project(
    v_enterprise_id, 'verification-blocked', 'hospitality_ecotourism', 'CO',
    'America/Bogota', 'es', v_content, 'verification', 'actor',
    array['platform_owner'], 'verification-create-paused'
  );
  if v_result ->> 'reasonCode' is distinct from 'ENTERPRISE_NOT_ACTIVE' then
    raise exception 'inactive enterprise assertion failed: %', v_result;
  end if;
end;
$$;

rollback;
