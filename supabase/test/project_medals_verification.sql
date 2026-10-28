-- Verification for 20261029_0002 (issue #249 B17): project medals. Always rolled back.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_project_a uuid := gen_random_uuid();
  v_project_b uuid := gen_random_uuid();
  v_medal_a uuid := gen_random_uuid();
  v_medal_retired uuid := gen_random_uuid();
  v_medal_b uuid := gen_random_uuid();
  v_existing_user uuid := gen_random_uuid();
  v_new_user uuid := gen_random_uuid();
  v_admin text[] := array['internal_admin'];
  v_owner text[] := array['platform_owner'];
  v_result jsonb;
  v_existing_report jsonb;
  v_new_report jsonb;
  v_count integer;
begin
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'medals-verification', 'Medals Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    (v_project_a, 'medals-project-a', 'other', 'en', '{"en":{"title":"A"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed'),
    (v_project_b, 'medals-project-b', 'other', 'en', '{"en":{"title":"B"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed');
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values
    (v_enterprise_id, v_project_a, 'owner', true, 'verification', 'seed'),
    (v_enterprise_id, v_project_b, 'owner', true, 'verification', 'seed');

  insert into public.project_medals (
    id, project_id, name, description, image_url, is_active, created_by_issuer, created_by_subject
  ) values
    (v_medal_a, v_project_a, 'Golf Open', 'First golf tournament', 'https://images.example.test/golf.png', true, 'verification', 'seed'),
    (v_medal_retired, v_project_a, 'Old Race', null, 'https://images.example.test/race.png', false, 'verification', 'seed'),
    (v_medal_b, v_project_b, 'Other Project', null, 'https://images.example.test/other.png', true, 'verification', 'seed');

  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_existing_user, 'existing', 'verification', 'existing.guest@example.test', true, 'Existing Guest');

  -- Only an active medal of the same project is accepted -----------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 10, 'Won the golf tournament', v_medal_b,
    'INV-MEDAL-1', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-1'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_MEDAL_UNAVAILABLE' then
    raise exception 'a medal of another project was accepted: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 10, 'Won the golf tournament', v_medal_retired,
    'INV-MEDAL-2', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-2'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_MEDAL_UNAVAILABLE' then
    raise exception 'a retired medal was accepted: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 10, 'Won the golf tournament', gen_random_uuid(),
    'INV-MEDAL-3', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-3'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_MEDAL_UNAVAILABLE' then
    raise exception 'an unknown medal was accepted: %', v_result;
  end if;

  -- An existing account gets the medal when the report is released ------------------------------
  v_existing_report := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 10, 'Won the golf tournament', v_medal_a,
    'INV-MEDAL-4', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-4'
  );
  if v_existing_report -> 'report' ->> 'status' <> 'released'
    or v_existing_report -> 'report' ->> 'medalId' is distinct from v_medal_a::text
  then
    raise exception 'the report did not keep its medal: %', v_existing_report;
  end if;
  select count(*) into v_count from public.user_medals
  where user_id = v_existing_user::text and medal_id = v_medal_a and revoked_at is null;
  if v_count <> 1 then
    raise exception 'the existing recipient was not awarded the medal: %', v_count;
  end if;

  -- A new person gets it only at the claim, once ----------------------------------------------------
  v_new_report := public.marketplace_submit_airs_report(
    v_project_a, 'new.guest@example.test', 'New Guest', 10, 'Won the golf tournament', v_medal_a,
    'INV-MEDAL-5', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-5'
  );
  if v_new_report -> 'report' ->> 'status' <> 'awaiting_claim' then
    raise exception 'the new guest report did not wait for the claim: %', v_new_report;
  end if;
  select count(*) into v_count from public.user_medals where report_id = (v_new_report -> 'report' ->> 'id')::uuid;
  if v_count <> 0 then
    raise exception 'a medal was awarded before the claim';
  end if;
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_new_user, 'new', 'verification', 'new.guest@example.test', true, 'New Guest');
  perform public.marketplace_claim_airs_reports(v_new_user::text, 'new.guest@example.test', true, 'medal-claim');
  perform public.marketplace_claim_airs_reports(v_new_user::text, 'new.guest@example.test', true, 'medal-claim-again');
  select count(*) into v_count from public.user_medals
  where user_id = v_new_user::text and medal_id = v_medal_a and revoked_at is null;
  if v_count <> 1 then
    raise exception 'the claim did not award the medal exactly once: %', v_count;
  end if;

  -- Reversing the report revokes the medal -------------------------------------------------------------
  v_result := public.marketplace_reverse_airs_report(
    (v_existing_report -> 'report' ->> 'id')::uuid, 'Reversed for verification', 'verification',
    'owner-a', v_owner, 'medal-reverse'
  );
  select count(*) into v_count from public.user_medals
  where user_id = v_existing_user::text and revoked_at is not null;
  if v_count <> 1 then
    raise exception 'the medal of a reversed report was not revoked: %', v_count;
  end if;
  select count(*) into v_count from public.user_medals where user_id = v_new_user::text and revoked_at is null;
  if v_count <> 1 then
    raise exception 'another report medal changed with the reversal: %', v_count;
  end if;

  -- A report without a medal awards nothing -------------------------------------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 5, 'No medal this time', null,
    'INV-MEDAL-6', null, 'verification', 'admin-a', v_admin, 'submitter@example.test', true, 'medal-6'
  );
  select count(*) into v_count from public.user_medals;
  if v_count <> 2 then
    raise exception 'a report without a medal changed the awards: %', v_count;
  end if;

  -- Constraints and access --------------------------------------------------------------------------------------
  begin
    insert into public.project_medals (project_id, name, image_url, created_by_issuer, created_by_subject)
    values (v_project_a, '  ', 'https://images.example.test/x.png', 'verification', 'seed');
    raise exception 'a blank medal name was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.project_medals (project_id, name, image_url, created_by_issuer, created_by_subject)
    values (v_project_a, 'Insecure', 'http://images.example.test/x.png', 'verification', 'seed');
    raise exception 'a non-https image was accepted';
  exception when check_violation then null;
  end;
  begin
    delete from public.project_medals where id = v_medal_a;
    raise exception 'a medal already used by a report was deleted';
  exception when foreign_key_violation then null;
  end;
  if has_table_privilege('anon', 'public.project_medals', 'select')
    or has_table_privilege('authenticated', 'public.project_medals', 'select')
    or has_table_privilege('authenticated', 'public.user_medals', 'select')
    or has_table_privilege('authenticated', 'public.user_medals', 'insert')
  then
    raise exception 'a client role can access the medal tables';
  end if;
  if (select relrowsecurity from pg_class where oid = 'public.project_medals'::regclass) is not true
    or (select relrowsecurity from pg_class where oid = 'public.user_medals'::regclass) is not true
  then
    raise exception 'row level security is off on a medal table';
  end if;
end;
$$;

rollback;
