-- Verification for 20261028_0001 (issue #249 B18): project types and the document rule.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back. All emails are fake.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_untyped uuid := gen_random_uuid();
  v_hotel uuid := gen_random_uuid();
  v_operator uuid := gen_random_uuid();
  v_admin text[] := array['internal_admin'];
  v_result jsonb;
  v_count integer;
  v_seen boolean;
begin
  -- Seeds ------------------------------------------------------------------
  select count(*) into v_count from public.project_types
  where code in ('hotel', 'restaurant', 'cafe', 'retail_store') and requires_document_number;
  if v_count <> 4 then
    raise exception 'commerce types must ask for a document number: %', v_count;
  end if;
  select count(*) into v_count from public.project_types
  where code in ('tourism_operator', 'events_sports', 'other') and not requires_document_number;
  if v_count <> 3 then
    raise exception 'the other types must not ask for a document number: %', v_count;
  end if;
  if exists (select 1 from public.project_types where not labels ? 'en' or not labels ? 'es') then
    raise exception 'every seeded type needs English and Spanish labels';
  end if;

  -- Fixture ---------------------------------------------------------------
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'project-types-verification', 'Project Types Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content, project_type_code,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    (v_untyped, 'types-untyped', 'other', 'en', '{"en":{"title":"U"}}'::jsonb, null,
      'verification', 'seed', 'verification', 'seed'),
    (v_hotel, 'types-hotel', 'other', 'en', '{"en":{"title":"H"}}'::jsonb, 'hotel',
      'verification', 'seed', 'verification', 'seed'),
    (v_operator, 'types-operator', 'other', 'en', '{"en":{"title":"O"}}'::jsonb, 'tourism_operator',
      'verification', 'seed', 'verification', 'seed');
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values
    (v_enterprise_id, v_untyped, 'owner', true, 'verification', 'seed'),
    (v_enterprise_id, v_hotel, 'owner', true, 'verification', 'seed'),
    (v_enterprise_id, v_operator, 'owner', true, 'verification', 'seed');

  -- The helper: no type means required, a type decides ------------------------
  if not public.marketplace_project_requires_document(v_untyped) then
    raise exception 'a project without a type must keep requiring the document number';
  end if;
  if not public.marketplace_project_requires_document(v_hotel) then
    raise exception 'a hotel must require the document number';
  end if;
  if public.marketplace_project_requires_document(v_operator) then
    raise exception 'a tourism operator must not require the document number';
  end if;
  if not public.marketplace_project_requires_document(gen_random_uuid()) then
    raise exception 'an unknown project must default to requiring the document number';
  end if;

  -- Reports without a document number -----------------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_untyped, 'guest.one@example.test', 'Guest One', 10, 'Stay without a type', null,
    null, null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'types-1'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED' then
    raise exception 'an untyped project accepted a report without a document number: %', v_result;
  end if;

  v_result := public.marketplace_submit_airs_report(
    v_hotel, 'guest.one@example.test', 'Guest One', 10, 'Stay at the hotel', null,
    null, null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'types-2'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED' then
    raise exception 'a hotel accepted a report without a document number: %', v_result;
  end if;

  v_result := public.marketplace_submit_airs_report(
    v_operator, 'guest.one@example.test', 'Guest One', 10, 'Guided tour with no invoice', null,
    null, null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'types-3'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true
    or v_result -> 'report' ->> 'status' <> 'awaiting_claim'
  then
    raise exception 'a tourism operator report without a document number was refused: %', v_result;
  end if;
  if (v_result -> 'report' ->> 'documentNumber') is not null then
    raise exception 'the missing document number must stay empty in the report: %', v_result;
  end if;

  -- With a number, every type accepts the report ----------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_hotel, 'guest.two@example.test', 'Guest Two', 10, 'Stay at the hotel', null,
    'INV-TYPES-1', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'types-4'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'a hotel refused a report with a document number: %', v_result;
  end if;

  -- Constraints ---------------------------------------------------------------------
  begin
    insert into public.project_types (code, labels) values ('no_english', '{"es":"Sin ingles"}'::jsonb);
    raise exception 'a type without an English label was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.project_types (code, labels) values ('Bad Code', '{"en":"Bad"}'::jsonb);
    raise exception 'a type with an invalid code was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.projects set project_type_code = 'does_not_exist' where id = v_hotel;
    raise exception 'a project accepted a type that does not exist';
  exception when foreign_key_violation then null;
  end;
  begin
    delete from public.project_types where code = 'hotel';
    raise exception 'a type in use was deleted';
  exception when foreign_key_violation then null;
  end;

  -- Client roles cannot touch the catalog or the helper ---------------------------
  if has_table_privilege('anon', 'public.project_types', 'select')
    or has_table_privilege('authenticated', 'public.project_types', 'select')
    or has_table_privilege('authenticated', 'public.project_types', 'insert')
    or has_table_privilege('authenticated', 'public.project_types', 'update')
  then
    raise exception 'a client role can access project_types';
  end if;
  if has_function_privilege('anon', 'public.marketplace_project_requires_document(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.marketplace_project_requires_document(uuid)', 'execute')
  then
    raise exception 'a client role can run the document helper';
  end if;
  select relrowsecurity into v_seen from pg_class where oid = 'public.project_types'::regclass;
  if v_seen is not true then
    raise exception 'row level security is off on project_types';
  end if;
end;
$$;

rollback;
