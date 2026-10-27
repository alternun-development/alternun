-- Verification for 20261027_0005 (issue #249 B8): unlocking the +5 / +5 rewards.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back. All emails are fake.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_project_account uuid := gen_random_uuid();
  v_submitter uuid := gen_random_uuid();
  v_late_submitter uuid := gen_random_uuid();
  v_one uuid := gen_random_uuid();
  v_two uuid := gen_random_uuid();
  v_three uuid := gen_random_uuid();
  v_admin text[] := array['internal_admin'];
  v_owner text[] := array['platform_owner'];
  v_result jsonb;
  v_report jsonb;
  v_count integer;
begin
  -- Fixture ---------------------------------------------------------------
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'airs-unlock-verification', 'Airs Unlock Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_project, 'airs-unlock-project', 'other', 'en', '{"en":{"title":"A"}}'::jsonb,
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values (v_enterprise_id, v_project, 'owner', true, 'verification', 'seed');

  insert into public.users (id, sub, iss, email, email_verified, name) values
    (v_project_account, 'project-account', 'verification', 'unlock.project@example.test', true, 'Project Account'),
    (v_submitter, 'admin-a', 'verification', 'unlock.submitter@example.test', true, 'Submitter');
  update public.projects set project_account_user_id = v_project_account::text where id = v_project;

  -- Guest one: 10 Airs, so the rewards start locked --------------------------
  v_result := public.marketplace_submit_airs_report(
    v_project, 'guest.one@example.test', 'Guest One', 10, 'Stay at the pilot hotel',
    null, 'INV-UNLOCK-1', null, 'verification', 'admin-a', v_admin,
    'unlock.submitter.mail@example.test', true, 'unlock-submit-1'
  );
  v_report := v_result -> 'report';
  if v_report ->> 'status' <> 'awaiting_claim' then
    raise exception 'report for a guest without a verified account did not wait: %', v_result;
  end if;

  -- The guest signs in with a confirmed email, so claiming releases the report.
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_one, 'guest-one', 'verification', 'guest.one@example.test', true, 'Guest One');
  v_result := public.marketplace_claim_airs_reports(
    v_one::text, 'guest.one@example.test', true, 'unlock-claim-1'
  );
  if (v_result ->> 'claimed')::integer <> 1 then
    raise exception 'guest one did not claim: %', v_result;
  end if;

  select count(*) into v_count from public.airs_report_rewards
  where status = 'locked' and amount = 5;
  if v_count <> 2 then
    raise exception 'below 20 paid Airs the two rewards must stay locked: %', v_count;
  end if;

  -- Bonus Airs never count toward the 20 ----------------------------------------
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_one, 'profile_completion_bonus', 'unlock-bonus-1', 50);
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_one, 'referral_bonus', 'unlock-bonus-2', 50);
  select count(*) into v_count from public.airs_report_rewards
  where status = 'locked';
  if v_count <> 2 then
    raise exception 'bonus Airs unlocked a reward: %', v_count;
  end if;

  -- 19 paid Airs: still locked. 20 exactly: unlocked ---------------------------
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_one, 'allied_commerce', 'unlock-paid-1', 9);
  select count(*) into v_count from public.airs_report_rewards where status = 'locked';
  if v_count <> 2 then
    raise exception '19 paid Airs unlocked a reward: %', v_count;
  end if;

  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_one, 'allied_commerce', 'unlock-paid-2', 1);
  select count(*) into v_count from public.airs_report_rewards
  where status = 'credited' and ledger_entry_id is not null and credited_at is not null;
  if v_count <> 2 then
    raise exception 'exactly 20 paid Airs did not unlock both rewards: %', v_count;
  end if;

  select count(*) into v_count from public.airs_ledger_entries
  where source_kind = 'admin_airs_report_reward' and airs_delta = 5
    and user_id::text in (v_submitter::text, v_project_account::text);
  if v_count <> 2 then
    raise exception 'expected one reward entry for the submitter and one for the project: %', v_count;
  end if;
  if (select count(distinct user_id) from public.airs_ledger_entries
      where source_kind = 'admin_airs_report_reward') <> 2 then
    raise exception 'both rewards went to the same account';
  end if;
  select count(*) into v_count from public.admin_audit_log
  where action = 'airs_report.reward_unlocked' and result = 'allowed';
  if v_count <> 2 then
    raise exception 'unlocks were not audited: %', v_count;
  end if;

  -- More paid Airs, and a direct retry, credit nothing twice -------------------
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_one, 'allied_commerce', 'unlock-paid-3', 30);
  v_result := public.airs_report_unlock_rewards(v_one::text, 'unlock-retry');
  if (v_result ->> 'unlocked')::integer <> 0 then
    raise exception 'a retry unlocked again: %', v_result;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where source_kind = 'admin_airs_report_reward';
  if v_count <> 2 then
    raise exception 'rewards were credited twice: %', v_count;
  end if;

  -- Guest two: reversed before reaching 20, so the rewards are void ------------
  v_result := public.marketplace_submit_airs_report(
    v_project, 'guest.two@example.test', 'Guest Two', 10, 'Dinner at the pilot hotel',
    null, 'INV-UNLOCK-2', null, 'verification', 'admin-a', v_admin,
    'unlock.submitter.mail@example.test', true, 'unlock-submit-2'
  );
  v_report := v_result -> 'report';
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_two, 'guest-two', 'verification', 'guest.two@example.test', true, 'Guest Two');
  perform public.marketplace_claim_airs_reports(
    v_two::text, 'guest.two@example.test', true, 'unlock-claim-2'
  );
  v_result := public.marketplace_reverse_airs_report(
    (v_report ->> 'id')::uuid, 'Reversed for verification', 'verification', 'owner-a',
    v_owner, 'unlock-reverse-2'
  );
  if v_result -> 'report' ->> 'status' <> 'reversed' then
    raise exception 'report was not reversed: %', v_result;
  end if;
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_two, 'allied_commerce', 'unlock-paid-two', 80);
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report ->> 'id')::uuid and status = 'void';
  if v_count <> 2 then
    raise exception 'rewards of the reversed report were not voided: %', v_count;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where source_kind = 'admin_airs_report_reward';
  if v_count <> 2 then
    raise exception 'a reversed report credited a reward: %', v_count;
  end if;

  -- Guest three: 25 Airs reach 20 at the claim; the submitter has no account yet,
  -- so only the project reward is credited and theirs waits ----------------------
  v_result := public.marketplace_submit_airs_report(
    v_project, 'guest.three@example.test', 'Guest Three', 25, 'Event at the pilot hotel',
    null, 'INV-UNLOCK-3', null, 'verification', 'admin-late', v_admin,
    'unlock.late.mail@example.test', true, 'unlock-submit-3'
  );
  v_report := v_result -> 'report';
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_three, 'guest-three', 'verification', 'guest.three@example.test', true, 'Guest Three');
  v_result := public.marketplace_claim_airs_reports(
    v_three::text, 'guest.three@example.test', true, 'unlock-claim-3'
  );
  if (v_result ->> 'claimed')::integer <> 1 then
    raise exception 'guest three did not claim: %', v_result;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report ->> 'id')::uuid and kind = 'project' and status = 'credited';
  if v_count <> 1 then
    raise exception 'the project reward did not unlock at the claim: %', v_count;
  end if;
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report ->> 'id')::uuid and kind = 'submitter' and status = 'locked';
  if v_count <> 1 then
    raise exception 'a reward without a beneficiary was not kept locked: %', v_count;
  end if;

  -- The submitter signs in later: the next paid entry credits the waiting reward.
  insert into public.users (id, sub, iss, email, email_verified, name)
  values (v_late_submitter, 'admin-late', 'verification', 'unlock.late@example.test', true, 'Late Submitter');
  insert into public.airs_ledger_entries (user_id, source_kind, idempotency_key, airs_delta)
  values (v_three, 'allied_commerce', 'unlock-paid-three', 5);
  select count(*) into v_count from public.airs_report_rewards
  where report_id = (v_report ->> 'id')::uuid and kind = 'submitter' and status = 'credited'
    and beneficiary_user_id = v_late_submitter::text;
  if v_count <> 1 then
    raise exception 'the waiting reward was not credited once its beneficiary existed: %', v_count;
  end if;

  -- Invalid input and client roles ------------------------------------------------
  v_result := public.airs_report_unlock_rewards('', 'unlock-invalid');
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_INPUT_INVALID' then
    raise exception 'invalid input was accepted: %', v_result;
  end if;
  if has_function_privilege('anon', 'public.airs_report_unlock_rewards(text, text)', 'execute')
    or has_function_privilege('authenticated', 'public.airs_report_unlock_rewards(text, text)', 'execute')
    or has_function_privilege('authenticated', 'public.airs_report_write_reward_ledger(text, text, integer, public.airs_reports, uuid, text)', 'execute')
  then
    raise exception 'a client role can execute an unlock function';
  end if;
end;
$$;

rollback;
