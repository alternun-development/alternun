-- Verification for 20261027_0003_create_airs_reports (issue #249 B15).
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back. All emails are fake.

begin;

do $$
declare
  v_enterprise_id uuid := gen_random_uuid();
  v_project_a uuid := gen_random_uuid();
  v_project_b uuid := gen_random_uuid();
  v_user_verified uuid := gen_random_uuid();
  v_user_unverified uuid := gen_random_uuid();
  v_user_multi uuid := gen_random_uuid();
  v_user_monthly uuid := gen_random_uuid();
  v_user_pending uuid := gen_random_uuid();
  v_user_moderator uuid := gen_random_uuid();
  v_user_moderator_alias uuid := gen_random_uuid();
  v_user_other uuid := gen_random_uuid();
  v_super text[] := array['internal_admin'];
  v_owner text[] := array['platform_owner'];
  v_moderator text[] := array['sub_admin'];
  v_result jsonb;
  v_report jsonb;
  v_pending jsonb;
  v_new_user jsonb;
  v_error text;
  v_count integer;
  i integer;
begin
  -- Fixture ---------------------------------------------------------------
  insert into public.enterprises (
    id, slug, display_name, status, created_by_issuer, created_by_subject,
    updated_by_issuer, updated_by_subject
  ) values (
    v_enterprise_id, 'airs-report-verification', 'Airs Report Verification', 'active',
    'verification', 'seed', 'verification', 'seed'
  );
  insert into public.projects (
    id, slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values
    (v_project_a, 'airs-report-project-a', 'other', 'en', '{"en":{"title":"A"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed'),
    (v_project_b, 'airs-report-project-b', 'other', 'en', '{"en":{"title":"B"}}'::jsonb,
      'verification', 'seed', 'verification', 'seed');
  insert into public.enterprise_projects (
    enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject
  ) values
    (v_enterprise_id, v_project_a, 'owner', true, 'verification', 'seed'),
    (v_enterprise_id, v_project_b, 'owner', true, 'verification', 'seed');
  insert into public.project_memberships (
    member_issuer, member_subject, enterprise_id, project_id, scope_type, role,
    granted_by_issuer, granted_by_subject
  ) values (
    'verification', 'moderator-a', v_enterprise_id, v_project_a, 'project', 'sub_admin',
    'verification', 'seed'
  );
  insert into public.users (id, sub, iss, email, email_verified, name) values
    (v_user_verified, 'guest-verified', 'verification', 'guest.verified@example.test', true, 'Verified Guest'),
    (v_user_unverified, 'guest-unverified', 'verification', 'guest.unverified@example.test', false, 'Unverified Guest'),
    (v_user_multi, 'guest-multi', 'verification', 'multi.project@example.test', true, 'Multi Project Guest'),
    (v_user_monthly, 'guest-monthly', 'verification', 'monthly.guest@example.test', true, 'Monthly Guest'),
    (v_user_pending, 'guest-pending', 'verification', 'pending.guest@example.test', true, 'Pending Guest'),
    (v_user_moderator, 'moderator-own-account', 'verification', 'moderator.a@example.test', true, 'Moderator A'),
    (v_user_moderator_alias, 'moderator-a', 'verification', 'moderator.alias@example.test', true, 'Moderator A Alias'),
    (v_user_other, 'guest-other', 'verification', 'other.guest@example.test', true, 'Other Guest');
  insert into public.airs_report_approvers (email) values
    ('approver.one@example.test'),
    ('approver.two@example.test');
  insert into public.airs_report_approvers (email, is_active) values
    ('approver.inactive@example.test', false);

  -- Auto-approval at the daily edge, then one Air more goes to review --------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, ' Guest.Verified@Example.test ', null, 60, 'Two nights at the pilot hotel',
    null, 'INV-1', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'daily-1'
  );
  v_report := v_result -> 'report';
  if v_report ->> 'status' <> 'released'
    or (v_result -> 'autoApproval' ->> 'approved')::boolean is not true
    or v_report ->> 'recipientEmail' <> 'guest.verified@example.test'
    or v_report ->> 'recipientUserId' <> v_user_verified::text
  then
    raise exception 'auto-approval within limits failed: %', v_result;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where idempotency_key = 'airs-report:' || (v_report ->> 'id') || ':recipient'
    and source_kind = 'admin_airs_report' and airs_delta = 60
    and user_id::text = v_user_verified::text;
  if v_count <> 1 then
    raise exception 'auto-approved report was not credited once: %', v_count;
  end if;
  if not exists (
    select 1 from public.admin_audit_log
    where action = 'airs_report.auto_approved' and target_id = (v_report ->> 'id')::uuid
      and actor_issuer = 'system' and metadata -> 'totals' ->> 'dailyTotal' = '60'
  ) then
    raise exception 'auto-approval was not audited with the system actor and totals';
  end if;

  -- Same request id replays without a second report or credit.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 60, 'Two nights at the pilot hotel',
    null, 'INV-1', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'daily-1'
  );
  if (v_result ->> 'idempotent')::boolean is not true
    or v_result -> 'report' ->> 'id' <> v_report ->> 'id'
  then
    raise exception 'submit replay was not idempotent: %', v_result;
  end if;

  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 40, 'Dinner for the group at the hotel',
    null, 'INV-daily-2', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'daily-2'
  );
  if v_result -> 'report' ->> 'status' <> 'released'
    or v_result -> 'autoApproval' -> 'totals' ->> 'dailyTotal' <> '100'
  then
    raise exception 'report reaching exactly 100 per day was not auto-approved: %', v_result;
  end if;

  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 1, 'Late checkout courtesy points',
    null, 'INV-daily-3', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'daily-3'
  );
  v_pending := v_result -> 'report';
  if v_pending ->> 'status' <> 'pending_approval'
    or (v_result -> 'autoApproval' ->> 'approved')::boolean is not false
    or v_pending ->> 'ledgerEntryId' is not null
  then
    raise exception 'report over 100 per day did not wait for review: %', v_result;
  end if;

  -- A report to the submitter's own account always waits for an approver -----
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'Moderator.A@Example.test', null, 10, 'Moderator reports Airs for itself',
    null, 'INV-SELF-1', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'self-email'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' ->> 'blockedReason' <> 'SELF_REPORT'
    or exists (select 1 from public.airs_ledger_entries where user_id::text = v_user_moderator::text)
  then
    raise exception 'report to the submitter email was auto-approved: %', v_result;
  end if;
  if not exists (
    select 1 from public.admin_audit_log
    where action = 'airs_report.submitted' and request_id = 'self-email'
      and metadata ->> 'autoApprovalBlockedReason' = 'SELF_REPORT'
  ) then
    raise exception 'self-report block reason was not audited';
  end if;

  -- Same person by issuer and subject, even with another email on the token.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'moderator.alias@example.test', null, 10, 'Moderator reports its other account',
    null, 'INV-SELF-2', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'self-account'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' ->> 'blockedReason' <> 'SELF_REPORT'
  then
    raise exception 'report to the submitter account was auto-approved: %', v_result;
  end if;

  -- Without a verified submitter email the self rule cannot be ruled out.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'other.guest@example.test', null, 10, 'Submitter token without an email',
    null, 'INV-NO-EMAIL', null, 'verification', 'moderator-a', v_moderator,
    null, false, 'no-submitter-email'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' ->> 'blockedReason' <> 'SUBMITTER_EMAIL_UNVERIFIED'
  then
    raise exception 'report without a submitter email was auto-approved: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'other.guest@example.test', null, 10, 'Submitter email is not verified',
    null, 'INV-UNVERIFIED', null, 'verification', 'moderator-a', v_moderator,
    'other.guest@example.test', false, 'unverified-submitter-email'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' ->> 'blockedReason' <> 'SELF_REPORT'
  then
    raise exception 'unverified submitter email matching the recipient was auto-approved: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'other.guest@example.test', null, 10, 'Submitter email is not verified',
    null, 'INV-UNVERIFIED-2', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', false, 'unverified-submitter-email-2'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' ->> 'blockedReason' <> 'SUBMITTER_EMAIL_UNVERIFIED'
  then
    raise exception 'report with an unverified submitter email was auto-approved: %', v_result;
  end if;

  -- Reports from several projects add up for the same recipient --------------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'multi.project@example.test', null, 70, 'Tour booked through project A',
    null, 'INV-multi-1', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'multi-1'
  );
  if v_result -> 'report' ->> 'status' <> 'released' then
    raise exception 'first multi-project report failed: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'multi.project@example.test', null, 30, 'Workshop booked through project B',
    null, 'INV-multi-2', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'multi-2'
  );
  if v_result -> 'report' ->> 'status' <> 'released'
    or v_result -> 'autoApproval' -> 'totals' ->> 'dailyTotal' <> '100'
  then
    raise exception 'second multi-project report did not count project A: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'multi.project@example.test', null, 1, 'Extra point from project B',
    null, 'INV-multi-3', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'multi-3'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval' then
    raise exception 'cross-project total over the limit was auto-approved: %', v_result;
  end if;

  -- Reports waiting for review still count, so small follow-ups cannot slip through.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'pending.guest@example.test', null, 150, 'Large stay waiting for review',
    null, 'INV-pending-1', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'pending-1'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval' then
    raise exception 'report over the daily limit was not pending: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'pending.guest@example.test', null, 1, 'Small follow-up after a large one',
    null, 'INV-pending-2', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'pending-2'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval'
    or v_result -> 'autoApproval' -> 'totals' ->> 'dailyTotal' <> '151'
  then
    raise exception 'pending report was not counted toward the limits: %', v_result;
  end if;

  -- Monthly edge: relax the daily limit so only the monthly one binds --------
  update public.airs_report_settings set daily_limit = 300 where id;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'monthly.guest@example.test', null, 200, 'Season pass for the nature trail',
    null, 'INV-monthly-1', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'monthly-1'
  );
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'monthly.guest@example.test', null, 100, 'Volunteer weekend in project B',
    null, 'INV-monthly-2', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'monthly-2'
  );
  if v_result -> 'report' ->> 'status' <> 'released'
    or v_result -> 'autoApproval' -> 'totals' ->> 'monthlyTotal' <> '300'
  then
    raise exception 'report reaching exactly 300 per month was not auto-approved: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'monthly.guest@example.test', null, 1, 'One more point this month',
    null, 'INV-monthly-3', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'monthly-3'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval' then
    raise exception 'report over 300 per month was auto-approved: %', v_result;
  end if;
  update public.airs_report_settings set daily_limit = 100 where id;

  -- Submit permissions ----------------------------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'guest.verified@example.test', null, 5, 'Moderator outside its project',
    null, 'INV-cross-project', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'cross-project'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'cross-project submit was not denied: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 5, 'Read-only role tries to submit',
    null, 'INV-readonly', null, 'verification', 'readonly', array['partner_readonly'],
    'readonly@example.test', true, 'readonly'
  );
  if v_result ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
    raise exception 'read-only submit was not denied: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'new.person@example.test', null, 5, 'New person without a name',
    null, 'INV-no-name', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'no-name'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_RECIPIENT_NAME_REQUIRED' then
    raise exception 'missing name for a new person was accepted: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 5, 'Report without a document number',
    null, null, null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'no-document'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED' then
    raise exception 'report without a document number was accepted: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 5, 'Report with a blank document number',
    null, '   ', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'blank-document'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED' then
    raise exception 'report with a blank document number was accepted: %', v_result;
  end if;
  if exists (select 1 from public.airs_reports where request_id in ('no-document', 'blank-document')) then
    raise exception 'report without a document number was stored';
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 5, 'Medal before the catalog exists',
    gen_random_uuid(), 'INV-medal', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'medal'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_MEDAL_UNAVAILABLE' then
    raise exception 'medal was accepted before the catalog: %', v_result;
  end if;
  if not exists (
    select 1 from public.admin_audit_log
    where action = 'airs_report.submit_denied' and request_id = 'cross-project'
      and result = 'denied' and reason_code = 'PROJECT_SCOPE_DENIED'
  ) then
    raise exception 'denied submit was not audited';
  end if;

  -- Approval permissions ----------------------------------------------------
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'owner',
    v_owner, 'owner@example.test', true, 'approve-not-listed'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_APPROVER_NOT_ALLOWED' then
    raise exception 'non-allowlisted approver was not denied: %', v_result;
  end if;
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-one',
    v_super, 'approver.one@example.test', false, 'approve-unverified'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_APPROVER_NOT_ALLOWED' then
    raise exception 'approver with an unverified email was not denied: %', v_result;
  end if;
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-x',
    v_super, 'approver.inactive@example.test', true, 'approve-inactive'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_APPROVER_NOT_ALLOWED' then
    raise exception 'inactive approver was not denied: %', v_result;
  end if;

  -- An approver cannot approve a report they submitted.
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 10, 'Approver submits a report',
    null, 'INV-self-submit', null, 'verification', 'approver-one', v_super,
    'approver.one@example.test', true, 'self-submit'
  );
  if v_result -> 'report' ->> 'status' <> 'pending_approval' then
    raise exception 'self-approval fixture was not pending: %', v_result;
  end if;
  v_result := public.marketplace_approve_airs_report(
    (v_result -> 'report' ->> 'id')::uuid, v_result -> 'report' ->> 'snapshotHash',
    'verification', 'approver-one', v_super, 'approver.one@example.test', true, 'self-approve'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_SELF_APPROVAL_DENIED' then
    raise exception 'self-approval was not denied: %', v_result;
  end if;

  -- Snapshot tampering --------------------------------------------------------
  v_error := null;
  begin
    update public.airs_reports set amount = 1000 where id = (v_pending ->> 'id')::uuid;
  exception when others then v_error := sqlerrm;
  end;
  if v_error is distinct from 'AIRS_REPORT_SNAPSHOT_IMMUTABLE' then
    raise exception 'snapshot update was not blocked: %', coalesce(v_error, 'updated');
  end if;

  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, repeat('0', 64), 'verification', 'approver-one',
    v_super, 'approver.one@example.test', true, 'approve-wrong-hash'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_SNAPSHOT_MISMATCH' then
    raise exception 'approval with another hash was not denied: %', v_result;
  end if;

  -- Even with the guard trigger off, a changed column breaks the hash.
  alter table public.airs_reports disable trigger airs_reports_guard_write;
  update public.airs_reports set amount = 1000 where id = (v_pending ->> 'id')::uuid;
  alter table public.airs_reports enable trigger airs_reports_guard_write;
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-one',
    v_super, 'approver.one@example.test', true, 'approve-tampered'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_SNAPSHOT_MISMATCH' then
    raise exception 'tampered report was approved: %', v_result;
  end if;
  alter table public.airs_reports disable trigger airs_reports_guard_write;
  update public.airs_reports set amount = 1 where id = (v_pending ->> 'id')::uuid;
  alter table public.airs_reports enable trigger airs_reports_guard_write;

  -- Manual approval of an existing verified account releases it --------------
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-one',
    v_super, 'approver.one@example.test', true, 'approve-pending'
  );
  if v_result -> 'report' ->> 'status' <> 'released'
    or v_result -> 'report' -> 'decision' ->> 'kind' <> 'manual'
  then
    raise exception 'approved report for an existing user was not released: %', v_result;
  end if;

  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-one',
    v_super, 'approver.one@example.test', true, 'approve-pending'
  );
  if (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'approve replay was not idempotent: %', v_result;
  end if;
  v_result := public.marketplace_approve_airs_report(
    (v_pending ->> 'id')::uuid, v_pending ->> 'snapshotHash', 'verification', 'approver-two',
    v_super, 'approver.two@example.test', true, 'approve-again'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_TRANSITION_INVALID' then
    raise exception 'second approval of a released report was allowed: %', v_result;
  end if;

  -- Double release is idempotent and writes one ledger entry.
  v_result := public.marketplace_release_airs_report(
    (v_pending ->> 'id')::uuid, 'verification', 'super-admin', v_super, 'release-twice'
  );
  if (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'release of a released report was not idempotent: %', v_result;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where idempotency_key = 'airs-report:' || (v_pending ->> 'id') || ':recipient';
  if v_count <> 1 then
    raise exception 'released report has % ledger entries', v_count;
  end if;

  -- New person and unverified account wait for the claim ---------------------
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'new.person@example.test', 'New Person', 20, 'First visit to the pilot hotel',
    null, 'INV-new-person', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'new-person'
  );
  v_new_user := v_result -> 'report';
  if v_new_user ->> 'status' <> 'awaiting_claim' or v_new_user ->> 'ledgerEntryId' is not null then
    raise exception 'report for a new person did not wait for the claim: %', v_result;
  end if;
  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.unverified@example.test', 'Unverified Guest', 20,
    'Guest whose email is not confirmed', null, 'INV-unverified', null,
    'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'unverified'
  );
  if v_result -> 'report' ->> 'status' <> 'awaiting_claim'
    or exists (select 1 from public.airs_ledger_entries where user_id::text = v_user_unverified::text)
  then
    raise exception 'unverified account was credited without a claim: %', v_result;
  end if;
  v_result := public.marketplace_release_airs_report(
    (v_new_user ->> 'id')::uuid, 'verification', 'super-admin', v_super, 'release-awaiting'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_TRANSITION_INVALID' then
    raise exception 'awaiting_claim report was released without a claim: %', v_result;
  end if;
  v_result := public.marketplace_claim_airs_reports(
    gen_random_uuid()::text, 'new.person@example.test', true, 'claim'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_CLAIM_USER_NOT_FOUND' then
    raise exception 'claim for an unknown account was not denied: %', v_result;
  end if;

  -- Cancel ----------------------------------------------------------------
  v_result := public.marketplace_cancel_airs_report(
    (v_new_user ->> 'id')::uuid, 'Wrong email', 'verification', 'moderator-a', v_moderator,
    'cancel-awaiting-moderator'
  );
  if v_result ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
    raise exception 'moderator cancelled an awaiting_claim report: %', v_result;
  end if;
  v_result := public.marketplace_cancel_airs_report(
    (v_new_user ->> 'id')::uuid, 'Wrong email', 'verification', 'super-admin', v_super,
    'cancel-awaiting-super'
  );
  if v_result -> 'report' ->> 'status' <> 'cancelled' then
    raise exception 'super admin could not cancel an awaiting_claim report: %', v_result;
  end if;

  v_result := public.marketplace_submit_airs_report(
    v_project_a, 'guest.verified@example.test', null, 50, 'Report the submitter cancels',
    null, 'INV-to-cancel', null, 'verification', 'moderator-a', v_moderator,
    'moderator.a@example.test', true, 'to-cancel'
  );
  v_result := public.marketplace_cancel_airs_report(
    (v_result -> 'report' ->> 'id')::uuid, '', 'verification', 'moderator-a', v_moderator,
    'cancel-no-reason'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_REASON_REQUIRED' then
    raise exception 'cancel without a reason was accepted: %', v_result;
  end if;
  select to_jsonb(report) into v_report from public.airs_reports report
  where request_id = 'to-cancel';
  v_result := public.marketplace_cancel_airs_report(
    (v_report ->> 'id')::uuid, 'Duplicate invoice', 'verification', 'moderator-a', v_moderator,
    'cancel-pending'
  );
  if v_result -> 'report' ->> 'status' <> 'cancelled' then
    raise exception 'submitter could not cancel a pending report: %', v_result;
  end if;

  -- Reject ----------------------------------------------------------------
  v_result := public.marketplace_submit_airs_report(
    v_project_b, 'multi.project@example.test', null, 500, 'Large grant that will be rejected',
    null, 'INV-to-reject', null, 'verification', 'super-admin', v_super,
    'super.admin@example.test', true, 'to-reject'
  );
  v_report := v_result -> 'report';
  v_result := public.marketplace_reject_airs_report(
    (v_report ->> 'id')::uuid, ' ', 'verification', 'approver-two', v_super,
    'approver.two@example.test', true, 'reject-no-reason'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_REASON_REQUIRED' then
    raise exception 'reject without a reason was accepted: %', v_result;
  end if;
  v_result := public.marketplace_reject_airs_report(
    (v_report ->> 'id')::uuid, 'Amount does not match the invoice', 'verification',
    'approver-two', v_super, 'approver.two@example.test', true, 'reject'
  );
  if v_result -> 'report' ->> 'status' <> 'rejected'
    or v_result -> 'report' -> 'decision' ->> 'outcome' <> 'rejected'
  then
    raise exception 'approver could not reject a pending report: %', v_result;
  end if;
  v_result := public.marketplace_approve_airs_report(
    (v_report ->> 'id')::uuid, v_report ->> 'snapshotHash', 'verification', 'approver-one',
    v_super, 'approver.one@example.test', true, 'approve-rejected'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_TRANSITION_INVALID' then
    raise exception 'rejected report was approved: %', v_result;
  end if;

  -- Reverse ---------------------------------------------------------------
  v_result := public.marketplace_reverse_airs_report(
    (v_pending ->> 'id')::uuid, 'Invoice was refunded', 'verification', 'super-admin',
    v_super, 'reverse-super'
  );
  if v_result ->> 'reasonCode' is distinct from 'PERMISSION_DENIED' then
    raise exception 'internal_admin reversed a report: %', v_result;
  end if;
  v_result := public.marketplace_reverse_airs_report(
    (v_pending ->> 'id')::uuid, 'Invoice was refunded', 'verification', 'owner',
    v_owner, 'reverse-owner'
  );
  if v_result -> 'report' ->> 'status' <> 'reversed' then
    raise exception 'platform_owner could not reverse a released report: %', v_result;
  end if;
  v_result := public.marketplace_reverse_airs_report(
    (v_pending ->> 'id')::uuid, 'Invoice was refunded', 'verification', 'owner',
    v_owner, 'reverse-owner-again'
  );
  if (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'second reversal was not idempotent: %', v_result;
  end if;
  select count(*) into v_count from public.airs_ledger_entries
  where idempotency_key = 'airs-report:' || (v_pending ->> 'id') || ':reversal' and airs_delta = -1;
  if v_count <> 1 then
    raise exception 'reversal wrote % ledger entries', v_count;
  end if;

  -- Transitions outside the state machine are rejected by the table itself.
  v_error := null;
  begin
    update public.airs_reports set status = 'approved' where id = (v_pending ->> 'id')::uuid;
  exception when others then v_error := sqlerrm;
  end;
  if v_error is distinct from 'AIRS_REPORT_TRANSITION_INVALID' then
    raise exception 'reversed report moved back to approved: %', coalesce(v_error, 'updated');
  end if;
  v_error := null;
  begin
    delete from public.airs_reports where id = (v_pending ->> 'id')::uuid;
  exception when others then v_error := sqlerrm;
  end;
  if v_error is distinct from 'AIRS_REPORT_DELETE_DENIED' then
    raise exception 'report delete was not blocked: %', coalesce(v_error, 'deleted');
  end if;

  -- Recipient lookup: minimal fields, scope and rate limit -------------------
  v_result := public.marketplace_lookup_airs_report_recipient(
    v_project_a, 'Guest.Verified@example.test', 'verification', 'moderator-a', v_moderator, 'lookup-1'
  );
  if v_result -> 'recipient' <> jsonb_build_object(
    'email', 'guest.verified@example.test', 'hasAccount', true, 'displayName', 'Verified Guest'
  ) then
    raise exception 'lookup of an existing user returned %', v_result;
  end if;
  v_result := public.marketplace_lookup_airs_report_recipient(
    v_project_a, 'guest.unverified@example.test', 'verification', 'moderator-a', v_moderator, 'lookup-2'
  );
  if (v_result -> 'recipient' ->> 'hasAccount')::boolean is not false
    or v_result -> 'recipient' ->> 'displayName' is not null
  then
    raise exception 'lookup exposed an unverified account: %', v_result;
  end if;
  v_result := public.marketplace_lookup_airs_report_recipient(
    v_project_b, 'guest.verified@example.test', 'verification', 'moderator-a', v_moderator, 'lookup-b'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'cross-project lookup was not denied: %', v_result;
  end if;
  for i in 3..30 loop
    v_result := public.marketplace_lookup_airs_report_recipient(
      v_project_a, 'guest.verified@example.test', 'verification', 'moderator-a', v_moderator,
      'lookup-' || i
    );
  end loop;
  if (v_result ->> 'ok')::boolean is not true then
    raise exception 'lookup 30 was limited too early: %', v_result;
  end if;
  v_result := public.marketplace_lookup_airs_report_recipient(
    v_project_a, 'guest.verified@example.test', 'verification', 'moderator-a', v_moderator, 'lookup-31'
  );
  if v_result ->> 'reasonCode' is distinct from 'AIRS_REPORT_LOOKUP_RATE_LIMITED' then
    raise exception 'lookup 31 was not rate limited: %', v_result;
  end if;

  -- Client roles stay outside the data plane --------------------------------
  if pg_catalog.has_table_privilege('anon', 'public.airs_reports', 'SELECT, INSERT, UPDATE, DELETE')
    or pg_catalog.has_table_privilege('authenticated', 'public.airs_reports', 'SELECT, INSERT, UPDATE, DELETE')
    or pg_catalog.has_table_privilege('anon', 'public.airs_report_approvers', 'SELECT')
    or pg_catalog.has_table_privilege('authenticated', 'public.airs_report_approvers', 'SELECT')
    or pg_catalog.has_function_privilege(
      'authenticated',
      'public.marketplace_submit_airs_report(uuid,text,text,integer,text,uuid,text,text,text,text,text[],text,boolean,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon',
      'public.marketplace_approve_airs_report(uuid,text,text,text,text[],text,boolean,text)',
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated', 'public.airs_report_settle(uuid,text,text,text[],text)', 'EXECUTE'
    )
  then
    raise exception 'client roles can reach airs report tables or functions';
  end if;
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.marketplace_submit_airs_report(uuid,text,text,integer,text,uuid,text,text,text,text,text[],text,boolean,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot submit airs reports';
  end if;
end;
$$;

set local role authenticated;

do $$
begin
  begin
    perform 1 from public.airs_reports limit 1;
    raise exception 'authenticated read of airs_reports unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
