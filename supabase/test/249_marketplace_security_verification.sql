-- Verification for issue #249 marketplace migrations.
-- Run after the issue #249 migrations and 20261018_0001. Catalog queries are
-- read-only; behavioral assertions run in a transaction that is always rolled
-- back.

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
    ('project_activity_completions'),
    ('project_comments'),
    ('project_participants')
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
    ('project_activity_completions'),
    ('project_comments'),
    ('project_participants')
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
    ('public.marketplace_set_enterprise_status(uuid,text,text,text,text[],text,text)', true),
    ('public.marketplace_create_comment(uuid,text,text,text,text,text,text)', true),
    ('public.marketplace_moderate_comment(uuid,text,text,text,text[],text,text)', true),
    ('public.marketplace_add_project_participant(uuid,text,text,text,text[],text)', true),
    ('public.marketplace_remove_project_participant(uuid,text,text,text[],text,text)', true)
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
      'project_activity_completions',
      'project_comments',
      'project_participants'
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

-- Eco Turismo must retain its original localized content, use Alternun as its
-- primary owner without removing Hotel Piloto, and expose the original Canva
-- presentation. The bounded audit counts verify that reapplying the migration
-- does not create duplicate effects.
with expected_content(content) as (
  values ('{
    "es": {
      "title": "Eco Turismo",
      "location": "Colombia",
      "theme": "Economía viva y territorio",
      "description": "Un proyecto de turismo consciente para activar colaboración, experiencias locales y valor regenerativo.",
      "waysToContribute": ["Participar", "Difundir", "Conectar aliados"]
    },
    "en": {
      "title": "Eco Tourism",
      "location": "Colombia",
      "theme": "Living economy and territory",
      "description": "A conscious tourism project that activates collaboration, local experiences, and regenerative value.",
      "waysToContribute": ["Participate", "Share", "Connect allies"]
    },
    "th": {
      "title": "อีโคทัวริซึม",
      "location": "โคลอมเบีย",
      "theme": "เศรษฐกิจมีชีวิตและพื้นที่",
      "description": "โครงการท่องเที่ยวอย่างมีสติเพื่อขับเคลื่อนความร่วมมือ ประสบการณ์ท้องถิ่น และคุณค่าเชิงฟื้นฟู",
      "waysToContribute": ["เข้าร่วม", "เผยแพร่", "เชื่อมต่อพันธมิตร"]
    }
  }'::jsonb)
), eco_project as (
  select project.*
  from public.projects project
  where project.slug = 'eco-turismo'
)
select
  (select count(*) = 1 from eco_project) as project_exists_once,
  coalesce((
    select project.status = 'published'
      and project.first_published_at is not null
      and project.published_at is not null
    from eco_project project
  ), false) as is_published,
  coalesce((
    select project.category_code = 'productive_enterprise'
      and project.country_code = 'CO'
      and project.time_zone = 'America/Bogota'
      and project.default_locale = 'es'
      and project.content = expected_content.content
    from eco_project project
    cross join expected_content
  ), false) as localized_content_matches,
  (
    select count(*) = 1
    from public.enterprise_projects relation
    join public.enterprises enterprise on enterprise.id = relation.enterprise_id
    join eco_project project on project.id = relation.project_id
    where relation.relation = 'owner'
      and relation.is_primary
      and enterprise.slug = 'alternun'
      and enterprise.display_name = 'Alternun'
      and enterprise.status = 'active'
  ) as alternun_is_primary_owner,
  (
    select count(*) = 1
    from public.enterprise_projects relation
    join public.enterprises enterprise on enterprise.id = relation.enterprise_id
    join eco_project project on project.id = relation.project_id
    where enterprise.slug = 'hotel-piloto'
  ) as hotel_piloto_relation_preserved,
  (
    select count(*) = 1
    from public.project_media media
    join eco_project project on project.id = media.project_id
    where media.kind = 'canva'
      and media.is_active
      and media.url = 'https://www.canva.com/design/DAHIGZY5d6Q/xOM9mNFn2qtqA8dd7WHrSQ/view?embed'
      and media.embed_url = media.url
      and media.alt_text = '{
        "es": "Presentación del proyecto Eco Turismo",
        "en": "Eco Tourism project presentation",
        "th": "งานนำเสนอโครงการอีโคทัวริซึม"
      }'::jsonb
      and media.caption = '{
        "es": "Presentación de Eco Turismo",
        "en": "Eco Tourism presentation",
        "th": "การนำเสนออีโคทัวริซึม"
      }'::jsonb
  ) as canva_media_matches,
  (
    select count(*) = 2
    from public.project_media_allowed_hosts host
    where host.media_kind = 'canva'
      and host.host in ('canva.com', 'www.canva.com')
  ) as canva_hosts_allowed,
  (
    select count(*) = 1
    from public.admin_audit_log audit
    join eco_project project on project.id = audit.project_id
    where audit.request_id = 'migration-20261018-0001-configuration'
      and audit.result = 'allowed'
  ) as configuration_audited_once,
  (
    select not exists (
      select audit.request_id
      from public.admin_audit_log audit
      join eco_project project on project.id = audit.project_id
      where audit.request_id in (
        'migration-20261018-0001-content',
        'migration-20261018-0001-publish'
      )
      group by audit.request_id
      having count(*) > 1
    )
  ) as rerun_has_no_duplicate_audits;

-- Behavioral assertions. Fixed fixture IDs are isolated by the final rollback.
begin;

do $$
declare
  v_result jsonb;
  v_project_id uuid;
  v_membership_id uuid;
  v_comment_id uuid;
  v_participant_id uuid;
  v_eco_project_id uuid;
  v_eco_audit_count_before bigint;
  v_eco_audit_count_after bigint;
  v_participant_user_id constant uuid := '24999999-0000-4000-8000-000000000004';
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
  select project.id into strict v_eco_project_id
  from public.projects project
  where project.slug = 'eco-turismo';

  select count(*) into v_eco_audit_count_before
  from public.admin_audit_log audit
  where audit.project_id = v_eco_project_id;

  v_result := public.marketplace_transition_project_status(
    v_eco_project_id,
    'published',
    'verification',
    'eco-turismo-rerun',
    array['platform_owner'],
    'verification-eco-turismo-rerun',
    null
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or coalesce((v_result ->> 'idempotent')::boolean, false) is not true
  then
    raise exception 'eco-turismo rerun assertion failed: %', v_result;
  end if;

  select count(*) into v_eco_audit_count_after
  from public.admin_audit_log audit
  where audit.project_id = v_eco_project_id;

  if v_eco_audit_count_after is distinct from v_eco_audit_count_before then
    raise exception 'eco-turismo rerun created a duplicate audit row';
  end if;

  insert into public.enterprises (
    id, slug, display_name, status, country_code,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'verification-enterprise', 'Verification Enterprise',
    'active', 'CO', 'verification', 'actor', 'verification', 'actor'
  );

  insert into public.users (
    id, sub, iss, email, email_verified, name
  ) values (
    v_participant_user_id, 'verification-participant', 'verification',
    'participant@example.test', true, 'Verification Participant'
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
  if public.marketplace_actor_has_scope(
    'verification', 'member-change', array['partner_readonly'], v_enterprise_id,
    v_project_id, array['sub_admin']
  ) is not false then
    raise exception 'claim and membership role mismatch assertion failed';
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, null, 'verification', 'actor', array['platform_owner'],
    'verification-participant-email-null'
  );
  if v_result ->> 'reasonCode' is distinct from 'PARTICIPANT_INPUT_INVALID' then
    raise exception 'participant email NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, 'missing@example.test', 'verification', 'actor',
    array['platform_owner'], 'verification-participant-user-missing'
  );
  if v_result ->> 'reasonCode' is distinct from 'USER_NOT_FOUND' then
    raise exception 'participant missing user assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, 'participant@example.test', 'verification', 'member-no-scope',
    array['sub_admin'], 'verification-participant-no-scope'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'participant membership scope assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, 'participant@example.test', 'verification', 'moderator',
    array['moderator'], 'verification-participant-moderator'
  );
  if v_result ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
    raise exception 'participant moderator assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, ' PARTICIPANT@example.test ', 'verification', 'member-change',
    array['sub_admin'], 'verification-participant-add'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or coalesce((v_result ->> 'idempotent')::boolean, true) is not false
    or v_result -> 'participant' ->> 'userId' is distinct from v_participant_user_id::text
  then
    raise exception 'participant scoped add assertion failed: %', v_result;
  end if;
  v_participant_id := (v_result -> 'participant' ->> 'id')::uuid;

  v_result := public.marketplace_add_project_participant(
    v_project_id, 'changed@example.test', 'verification', 'member-change',
    array['sub_admin'], 'verification-participant-add'
  );
  if coalesce((v_result ->> 'idempotent')::boolean, false) is not true
    or (v_result -> 'participant' ->> 'id')::uuid is distinct from v_participant_id
  then
    raise exception 'participant add idempotency assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_add_project_participant(
    v_project_id, 'participant@example.test', 'verification', 'actor',
    array['platform_owner'], 'verification-participant-duplicate'
  );
  if v_result ->> 'reasonCode' is distinct from 'PARTICIPANT_CONFLICT' then
    raise exception 'participant duplicate assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_remove_project_participant(
    v_participant_id, 'verification', 'member-change', array['sub_admin'],
    'verification-participant-remove-reason', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PARTICIPANT_REASON_REQUIRED' then
    raise exception 'participant removal reason assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_remove_project_participant(
    v_participant_id, 'verification', 'member-change', array['sub_admin'],
    'verification-participant-remove', 'No longer staying at the hotel'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or coalesce((v_result ->> 'idempotent')::boolean, true) is not false
  then
    raise exception 'participant removal assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_remove_project_participant(
    v_participant_id, 'verification', 'member-change', array['sub_admin'],
    'verification-participant-remove', 'Changed retry reason'
  );
  if coalesce((v_result ->> 'idempotent')::boolean, false) is not true then
    raise exception 'participant removal idempotency assertion failed: %', v_result;
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

  -- Comment validation is NULL-safe and never falls through to constraints.
  v_result := public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', null, 'verification-comment-null'
  );
  if v_result ->> 'reasonCode' is distinct from 'COMMENT_INPUT_INVALID' then
    raise exception 'comment NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_create_comment(
    v_missing_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'Missing project comment.',
    'verification-comment-project-missing'
  );
  if coalesce((v_result ->> 'ok')::boolean, true) is not false
    or v_result ->> 'reasonCode' is distinct from 'PROJECT_NOT_FOUND'
  then
    raise exception 'comment missing project assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_missing_id, 'visible', 'verification', 'actor', array['platform_owner'],
    'verification-comment-missing', null
  );
  if coalesce((v_result ->> 'ok')::boolean, true) is not false
    or v_result ->> 'reasonCode' is distinct from 'COMMENT_NOT_FOUND'
  then
    raise exception 'moderate missing comment assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'First verification comment.',
    'verification-comment-1'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or coalesce((v_result ->> 'idempotent')::boolean, true) is not false
  then
    raise exception 'comment creation assertion failed: %', v_result;
  end if;
  v_comment_id := (v_result -> 'comment' ->> 'id')::uuid;

  v_result := public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'Changed retry body.',
    'verification-comment-1'
  );
  if coalesce((v_result ->> 'idempotent')::boolean, false) is not true
    or (v_result -> 'comment' ->> 'id')::uuid is distinct from v_comment_id
  then
    raise exception 'comment idempotency assertion failed: %', v_result;
  end if;

  perform public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'Second verification comment.',
    'verification-comment-2'
  );
  perform public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'Third verification comment.',
    'verification-comment-3'
  );
  v_result := public.marketplace_create_comment(
    v_project_id, 'verification', 'commenter', 'comment-user',
    'Verification Commenter', 'Fourth verification comment.',
    'verification-comment-4'
  );
  if v_result ->> 'reasonCode' is distinct from 'COMMENT_RATE_LIMITED' then
    raise exception 'comment rate limit assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, null, 'verification', 'actor', array['platform_owner'],
    'verification-comment-status-null', null
  );
  if v_result ->> 'reasonCode' is distinct from 'COMMENT_TRANSITION_INVALID' then
    raise exception 'comment target NULL assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'visible', 'verification', 'member-no-scope',
    array['sub_admin'], 'verification-comment-no-scope', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'comment membership scope assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'visible', 'verification', 'member-change',
    array['sub_admin'], 'verification-comment-visible', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'comment scoped moderation assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'rejected', 'verification', 'actor', array['platform_owner'],
    'verification-comment-invalid-transition', 'invalid transition'
  );
  if v_result ->> 'reasonCode' is distinct from 'COMMENT_TRANSITION_INVALID' then
    raise exception 'comment invalid transition assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'hidden', 'verification', 'actor', array['platform_owner'],
    'verification-comment-reason-required', null
  );
  if v_result ->> 'reasonCode' is distinct from 'COMMENT_REASON_REQUIRED' then
    raise exception 'comment reason assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'hidden', 'verification', 'member-change', array['sub_admin'],
    'verification-comment-hidden', 'verification reason'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'comment hide assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_moderate_comment(
    v_comment_id, 'visible', 'verification', 'member-change', array['sub_admin'],
    'verification-comment-restored', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'comment restore assertion failed: %', v_result;
  end if;
end;
$$;

rollback;
