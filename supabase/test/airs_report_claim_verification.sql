-- Verification for 20261027_0002, 20261027_0004 and 20261027_0005 (issue #249 B2, B7, B8).
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back. All emails are fake.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_project_a uuid := gen_random_uuid();
  v_project_b uuid := gen_random_uuid();
  v_project_account uuid := gen_random_uuid();
  v_existing_user uuid := gen_random_uuid();
  v_new_user uuid := gen_random_uuid();
  v_other_user uuid := gen_random_uuid();
  v_unverified_user uuid := gen_random_uuid();
  v_super text[] := array['internal_admin'];
  v_owner text[] := array['platform_owner'];
  v_result jsonb;
  v_report_one jsonb;
  v_report_two jsonb;
  v_report_existing jsonb;
  v_report_other jsonb;
  v_count integer;
begin
  -- Fixture ---------------------------------------------------------------
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'airs-claim-verification', 'Airs Claim Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    (v_project_a, 'airs-claim-project-a', 'other', 'en', '{"en":{"title":"A"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed'),
    (v_project_b, 'airs-claim-project-b', 'other', 'en', '{"en":{"title":"B"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed');
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values
    (v_enterprise_id, v_project_a, 'owner', true, 'verification', 'seed'),
    (v_enterprise_id, v_project_b, 'owner', true, 'verification', 'seed');

  -- B2: both projects miss an account and an admin until they are linked.
  select count(*) into v_count
  from public.marketplace_projects_missing_account_or_admin()
  where slug in ('airs-claim-project-a', 'airs-claim-project-b')
    and missing_account and missing_admin;
  if v_count <> 2 then
    raise exception 'projects without account and admin were not listed: %', v_count;
  end if;

  insert into public.users (id, sub, iss, email, email_verified, name) values
    (v_project_account, 'project-account', 'verification', 'project.account@example.test', true, 'Project Account'),
    (v_existing_user, 'existing-guest', 'verification', 'existing.guest@example.test', true, 'Existing Guest');
  update public.projects set project_account_user_id = v_project_account::text where id = v_project_a;
  insert into public.project_memberships (
    member_issuer, member_subject, enterprise_id, project_id, scope_type, role,
    granted_by_issuer, granted_by_subject
  ) values (
    'verification', 'project-admin-a', v_enterprise_id, v_project_a, 'project', 'partner_operator',
    'verification', 'seed'
  );

  select count(*) into v_count
  from public.marketplace_projects_missing_account_or_admin()
  where slug = 'airs-claim-project-a';
  if v_count <> 0 then
    raise exception 'a project with account and admin was still listed';
  end if;
  select count(*) into v_count
  from public.marketplace_projects_missing_account_or_admin()
  where slug = 'airs-claim-project-b' and missing_account and missing_admin;
  if v_count <> 1 then
    raise exception 'a project without account and admin was not listed';
  end if;

  -- Two reports for an email without an account wait for the claim -----------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'New.Claimant@Example.test', 'New Claimant', 30, 'Stay at the pilot hotel',
    null, 'INV-CLAIM-1', null, 'verification', 'admin-a', v_super,
    'submitter@example.test', true, 'claim-submit-1'
  );
  v_report_one := v_result -> 'report';
  if v_report_one ->> 'status' <> 'awaiting_claim' then
    raise exception 'report for a new email did not wait for the claim: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'new.claimant@example.test', 'New Claimant', 40, 'Dinner at the pilot hotel',
    null, 'INV-CLAIM-2', null, 'verification', 'admin-a', v_super,
    'submitter@example.test', true, 'claim-submit-2'
  );
  v_report_two := v_result -> 'report';
  if v_report_two ->> 'status' <> 'awaiting_claim' then
    raise exception 'second report for a new email did not wait for the claim: %', v_result;
  end if;

  -- A report for another email must not be touched by the claim.
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'someone.else@example.test', 'Someone Else', 20, 'Another guest, another project',
    null, 'INV-OTHER', null, 'verification', 'admin-a', v_super,
    'submitter@example.test', true, 'claim-submit-other'
  );
  v_report_other := v_result -> 'report';

  -- A report for an existing verified account is credited at once: no rewards.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'existing.guest@example.test', null, 15, 'Existing guest, no rewards',
    null, 'INV-EXISTING', null, 'verification', 'admin-a', v_super,
    'submitter@example.test', true, 'claim-submit-existing'
  );
  v_report_existing := v_result -> 'report';
  if v_report_existing ->> 'status' <> 'released' then
    raise exception 'report for an existing account was not released: %', v_result;
  end if;

  select count(*) into v_count from public.airs_report_rewards;
  if v_count <> 0 then
    raise exception 'rewards exist before any claim: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where idempotency_key like 'airs-report:' || (v_report_one ->> 'id') || '%';
  if v_count <> 0 then
    raise exception 'a waiting report was credited before the claim';
  end if;

  -- The claim does nothing without an account or without a confirmed email ----
  insert into public.users (id, sub, iss, email, email_verified, name) values
    (v_unverified_user, 'claimant-unverified', 'verification', 'new.claimant@example.test', false, 'New Claimant');

  v_result := public.marketplace_claim_airs_reports(
    v_unverified_user::text, 'new.claimant@example.test', true, 'claim-unverified-stored'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_CLAIM_EMAIL_MISMATCH' then
    raise exception 'claim with an unverified stored email was accepted: %', v_result;
  end if;

  delete from public.users where id = v_unverified_user;
  insert into public.users (id, sub, iss, email, email_verified, name) values
    (v_new_user, 'claimant', 'verification', 'new.claimant@example.test', true, 'New Claimant'),
    (v_other_user, 'claimant-other', 'verification', 'other.person@example.test', true, 'Other Person');

  v_result := public.marketplace_claim_airs_reports(
    v_new_user::text, 'new.claimant@example.test', false, 'claim-not-confirmed'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_CLAIM_EMAIL_NOT_CONFIRMED' then
    raise exception 'claim with an unconfirmed session email was accepted: %', v_result;
  end if;

  v_result := public.marketplace_claim_airs_reports(
    v_other_user::text, 'new.claimant@example.test', true, 'claim-wrong-user'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_CLAIM_EMAIL_MISMATCH' then
    raise exception 'claim by an account with a different email was accepted: %', v_result;
  end if;

  v_result := public.marketplace_claim_airs_reports(
    gen_random_uuid()::text, 'new.claimant@example.test', true, 'claim-unknown-user'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_CLAIM_USER_NOT_FOUND' then
    raise exception 'claim for an unknown account was accepted: %', v_result;
  end if;

  v_result := public.marketplace_claim_airs_reports(' ', 'not-an-email', true, '');
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_INPUT_INVALID' then
    raise exception 'claim with invalid input was accepted: %', v_result;
  end if;

  select count(*) into v_count from public.airs_reports
  where recipient_email = 'new.claimant@example.test' and status = 'awaiting_claim';
  if v_count <> 2 then
    raise exception 'a denied claim changed the reports: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where user_id::text = v_new_user::text;
  if v_count <> 0 then
    raise exception 'a denied claim credited the account';
  end if;
  select count(*) into v_count from public.admin_audit_log
  where action = 'airs_report.claim_denied' and result = 'denied';
  if v_count < 3 then
    raise exception 'denied claims were not audited: %', v_count;
  end if;

  -- Claim with the confirmed email releases both reports at once -------------
  v_result := public.marketplace_claim_airs_reports(
    v_new_user::text, '  New.Claimant@Example.TEST ', true, 'claim-ok'
  );
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'claimed')::integer <> 2 then
    raise exception 'claim did not release both reports: %', v_result;
  end if;

  select count(*) into v_count from public.airs_reports
  where recipient_email = 'new.claimant@example.test'
    and status = 'released' and recipient_user_id = v_new_user::text
    and ledger_entry_id is not null and released_at is not null;
  if v_count <> 2 then
    raise exception 'claimed reports are not released with the account: %', v_count;
  end if;
  select coalesce(sum(airs_delta), 0)::integer into v_count
  from public.airs_ledger_entries
  where user_id::text = v_new_user::text and source_kind = 'admin_airs_report';
  if v_count <> 70 then
    raise exception 'recipient was not credited 30 + 40 Airs: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where user_id::text = v_new_user::text and source_kind = 'admin_airs_report';
  if v_count <> 2 then
    raise exception 'recipient does not have exactly two ledger entries: %', v_count;
  end if;

  -- Four rewards of 5. The claimant holds 70 paid Airs, so the project rewards unlock
  -- at the claim; the submitter has no Airs account in this fixture, so theirs wait.
  select count(*) into v_count from public.airs_report_rewards
  where kind = 'submitter' and status = 'locked' and amount = 5
    and ledger_entry_id is null and credited_at is null;
  if v_count <> 2 then
    raise exception 'expected two locked submitter rewards of 5: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where kind = 'project' and status = 'credited' and amount = 5
    and ledger_entry_id is not null and credited_at is not null;
  if v_count <> 2 then
    raise exception 'expected two credited project rewards of 5: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where kind = 'submitter' and beneficiary_issuer = 'verification'
    and beneficiary_subject = 'admin-a'
    and idempotency_key = 'airs-report:' || report_id::text || ':issuer-reward';
  if v_count <> 2 then
    raise exception 'submitter rewards are not tied to the submitter identity: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where kind = 'project' and beneficiary_user_id = v_project_account::text
    and idempotency_key = 'airs-report:' || report_id::text || ':project-reward';
  if v_count <> 2 then
    raise exception 'project rewards are not tied to the project account: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where user_id::text = v_project_account::text;
  if v_count <> 2 then
    raise exception 'the project account was not credited its two unlocked rewards: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where source_kind = 'admin_airs_report_reward';
  if v_count <> 2 then
    raise exception 'expected exactly two reward ledger entries: %', v_count;
  end if;

  -- Reports to existing accounts and to other emails never create rewards ----
  select count(*) into v_count from public.airs_report_rewards
  where report_id in (
    (v_report_existing ->> 'id')::uuid, (v_report_other ->> 'id')::uuid
  );
  if v_count <> 0 then
    raise exception 'rewards were created for reports that were not claimed: %', v_count;
  end if;
  if (select status from public.airs_reports where id = (v_report_other ->> 'id')::uuid)
    <> 'awaiting_claim'
  then
    raise exception 'a claim released a report for another email';
  end if;

  -- Retrying the claim (a repeated sign-in) credits nothing twice ------------
  v_result := public.marketplace_claim_airs_reports(
    v_new_user::text, 'new.claimant@example.test', true, 'claim-retry'
  );
  if (v_result ->> 'ok')::boolean is not true or (v_result ->> 'claimed')::integer <> 0 then
    raise exception 'claim retry was not a no-op: %', v_result;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where user_id::text = v_new_user::text and source_kind = 'admin_airs_report';
  if v_count <> 2 then
    raise exception 'claim retry credited twice: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards;
  if v_count <> 4 then
    raise exception 'claim retry created more rewards: %', v_count;
  end if;

  -- A frozen column changed behind the trigger blocks that report's claim -----
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'late.claimant@example.test', 'Late Claimant', 25, 'Late claimant first stay',
    null, 'INV-LATE', null, 'verification', 'admin-a', v_super,
    'submitter@example.test', true, 'claim-submit-late'
  );
  alter table public.airs_reports disable trigger airs_reports_guard_write;
  update public.airs_reports set amount = 90 where id = (v_result -> 'report' ->> 'id')::uuid;
  alter table public.airs_reports enable trigger airs_reports_guard_write;
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (gen_random_uuid(), 'late-claimant', 'verification', 'late.claimant@example.test', true, 'Late Claimant');
  v_result := public.marketplace_claim_airs_reports(
    (select id::text from public.users where sub = 'late-claimant'),
    'late.claimant@example.test', true, 'claim-tampered'
  );
  if (v_result ->> 'claimed')::integer <> 0
    or not exists (
      select 1 from public.admin_audit_log
      where action = 'airs_report.claim_denied' and reason_code = 'AIRS_REPORT_SNAPSHOT_MISMATCH'
    )
  then
    raise exception 'tampered report was claimed: %', v_result;
  end if;

  -- Reversing a claimed report voids its locked rewards -----------------------
  v_result := public.marketplace_reverse_airs_report(
    (v_report_one ->> 'id')::uuid, 'Reversed for verification', 'verification', 'owner-a',
    v_owner, 'claim-reverse'
  );
  if v_result -> 'report' ->> 'status' <> 'reversed' then
    raise exception 'claimed report was not reversed: %', v_result;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report_one ->> 'id')::uuid and status = 'void' and voided_at is not null
    and kind = 'submitter';
  if v_count <> 1 then
    raise exception 'the locked reward of the reversed report was not voided: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report_one ->> 'id')::uuid and status = 'credited' and kind = 'project';
  if v_count <> 1 then
    raise exception 'a reward already credited changed with the reversal: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report_two ->> 'id')::uuid and status in ('locked', 'credited');
  if v_count <> 2 then
    raise exception 'rewards of another report changed with the reversal: %', v_count;
  end if;

  -- Clients cannot run the claim or read the rewards ---------------------------
  if has_function_privilege('anon', 'public.marketplace_claim_airs_reports(text, text, boolean, text)', 'execute')
    or has_function_privilege('authenticated', 'public.marketplace_claim_airs_reports(text, text, boolean, text)', 'execute')
    or has_function_privilege('anon', 'public.marketplace_projects_missing_account_or_admin()', 'execute')
    or has_function_privilege('authenticated', 'public.marketplace_projects_missing_account_or_admin()', 'execute')
  then
    raise exception 'a client role can execute a claim or account function';
  end if;
  if has_table_privilege('anon', 'public.airs_report_rewards', 'select')
    or has_table_privilege('authenticated', 'public.airs_report_rewards', 'select')
    or has_table_privilege('authenticated', 'public.airs_report_rewards', 'insert')
  then
    raise exception 'a client role has access to airs_report_rewards';
  end if;
end;
$$;

set local role authenticated;

do $$
begin
  begin
    perform 1 from public.airs_report_rewards limit 1;
    raise exception 'authenticated read of airs_report_rewards unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
