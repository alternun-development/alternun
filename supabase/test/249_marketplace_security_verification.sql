-- Read-only verification for issue #249 marketplace migrations.
-- Run after 0001, 0002, and 0003 in testnet and production. This file does
-- not apply migrations or mutate data.

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
    ('public.marketplace_reverse_activity_completion(uuid,text,text,text[],text,text)', true)
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

