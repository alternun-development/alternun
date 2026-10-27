-- Issue #249 B8: unlocking the +5 / +5 rewards of a claimed User Airs Report.
--
-- On claim (20261027_0004) the submitter and the project account get a locked reward
-- of 5 Airs each. They are credited, once, when the new user holds at least 20 paid
-- Airs: Airs from a commercial relationship (allied_commerce) plus the Airs granted by
-- an admin report, which the decision of 2026-10-26 counts. Referral, profile and other
-- bonus Airs do not count.
--
-- The check runs at the end of every claim and after every paid ledger entry, so a new
-- user who buys later unlocks the rewards then. It is idempotent: each reward is
-- credited under its own key, and a retry credits nothing twice.

begin;

-- ─── Ledger write for a reward ──────────────────────────────────────────────

-- Same dynamic user_id handling as airs_report_write_ledger (the ledger user type
-- differs between environments), with the reward source kind.
create or replace function public.airs_report_write_reward_ledger(
  p_user_id text,
  p_idempotency_key text,
  p_amount integer,
  p_report public.airs_reports,
  p_reward_id uuid,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ledger_user_type text;
  v_entry_id uuid;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into v_ledger_user_type
  from pg_attribute attribute
  where attribute.attrelid = 'public.airs_ledger_entries'::regclass
    and attribute.attname = 'user_id'
    and not attribute.attisdropped;

  if v_ledger_user_type is null then
    raise exception 'AIRS_LEDGER_USER_TYPE_NOT_FOUND' using errcode = 'P0001';
  end if;

  execute format(
    'insert into public.airs_ledger_entries (
       user_id, source_kind, source_ref, idempotency_key, source_currency,
       source_amount, airs_rate, airs_delta, notes, metadata
     ) values (($1)::%s, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict do nothing
     returning id',
    v_ledger_user_type
  )
  into v_entry_id
  using
    p_user_id,
    'admin_airs_report_reward',
    'airs-report:' || p_report.id::text,
    p_idempotency_key,
    'AIRS',
    p_amount,
    1::numeric,
    p_amount,
    p_notes,
    jsonb_build_object(
      'projectId', p_report.project_id,
      'airsReportId', p_report.id,
      'rewardId', p_reward_id
    );

  if v_entry_id is null then
    select entry.id into v_entry_id
    from public.airs_ledger_entries entry
    where entry.user_id::text = p_user_id
      and entry.idempotency_key = p_idempotency_key;
  end if;

  if v_entry_id is null then
    raise exception 'AIRS_LEDGER_WRITE_FAILED' using errcode = 'P0001';
  end if;

  return v_entry_id;
end;
$$;

revoke all on function public.airs_report_write_reward_ledger(text, text, integer, public.airs_reports, uuid, text)
  from public, anon, authenticated;

-- ─── Unlock ─────────────────────────────────────────────────────────────────

-- p_user_id is the new user (the report recipient). Returns how many rewards were
-- credited and how many stay locked because their beneficiary cannot be resolved yet
-- (a submitter without an Airs account, a project without its account).
create or replace function public.airs_report_unlock_rewards(
  p_user_id text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c_threshold constant numeric := 20;
  v_user_id text := btrim(coalesce(p_user_id, ''));
  v_paid numeric;
  v_reward public.airs_report_rewards;
  v_report public.airs_reports;
  v_beneficiary text;
  v_entry_id uuid;
  v_unlocked integer := 0;
  v_waiting integer := 0;
begin
  if v_user_id = '' or nullif(btrim(coalesce(p_request_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'reasonCode', 'AIRS_REPORT_INPUT_INVALID');
  end if;

  if not exists (
    select 1
    from public.airs_report_rewards reward
    join public.airs_reports report on report.id = reward.report_id
    where reward.status = 'locked'
      and report.status = 'released'
      and report.recipient_user_id = v_user_id
  ) then
    return jsonb_build_object('ok', true, 'unlocked', 0, 'waiting', 0);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('airs-report-unlock:' || v_user_id, 0)
  );

  select coalesce(sum(entry.airs_delta), 0) into v_paid
  from public.airs_ledger_entries entry
  where entry.user_id::text = v_user_id
    and entry.source_kind in ('allied_commerce', 'admin_airs_report');

  if v_paid < c_threshold then
    return jsonb_build_object(
      'ok', true, 'unlocked', 0, 'waiting', 0,
      'paidAirs', v_paid, 'threshold', c_threshold
    );
  end if;

  -- A reward voided by a reversal while we waited for its row lock is skipped: the
  -- status filter is evaluated again once the lock is granted.
  for v_reward in
    select reward.*
    from public.airs_report_rewards reward
    join public.airs_reports report on report.id = reward.report_id
    where reward.status = 'locked'
      and report.status = 'released'
      and report.recipient_user_id = v_user_id
    order by report.released_at, reward.kind, reward.id
    for update of reward
  loop
    v_beneficiary := null;
    select * into v_report from public.airs_reports report where report.id = v_reward.report_id;

    if v_reward.kind = 'submitter' then
      select app_user.id::text into v_beneficiary
      from public.users app_user
      where app_user.iss = v_reward.beneficiary_issuer
        and app_user.sub = v_reward.beneficiary_subject
      limit 1;
    else
      select coalesce(
        nullif(btrim(coalesce(v_reward.beneficiary_user_id, '')), ''),
        nullif(btrim(coalesce(project.project_account_user_id, '')), '')
      ) into v_beneficiary
      from public.projects project
      where project.id = v_report.project_id;
    end if;

    if v_beneficiary is null then
      v_waiting := v_waiting + 1;
      continue;
    end if;

    v_entry_id := public.airs_report_write_reward_ledger(
      v_beneficiary,
      v_reward.idempotency_key,
      v_reward.amount,
      v_report,
      v_reward.id,
      v_report.concept
    );

    update public.airs_report_rewards
    set status = 'credited',
        beneficiary_user_id = v_beneficiary,
        ledger_entry_id = v_entry_id,
        credited_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = v_reward.id;

    perform public.airs_report_audit(
      'system', 'airs-report-unlock', '{}'::text[], 'airs_report.reward_unlocked',
      v_report.id, v_report.project_id, btrim(p_request_id), 'allowed', null,
      null, null,
      jsonb_build_object(
        'rewardId', v_reward.id, 'kind', v_reward.kind, 'amount', v_reward.amount,
        'beneficiaryUserId', v_beneficiary, 'ledgerEntryId', v_entry_id,
        'paidAirs', v_paid
      )
    );

    v_unlocked := v_unlocked + 1;
  end loop;

  return jsonb_build_object(
    'ok', true, 'unlocked', v_unlocked, 'waiting', v_waiting,
    'paidAirs', v_paid, 'threshold', c_threshold
  );
end;
$$;

revoke all on function public.airs_report_unlock_rewards(text, text)
  from public, anon, authenticated;
grant execute on function public.airs_report_unlock_rewards(text, text) to service_role;

-- ─── After every paid ledger entry ──────────────────────────────────────────

-- A failure here must never block the ledger write that fired it: the rewards stay
-- locked and the next paid entry (or claim) tries again.
create or replace function public.airs_report_unlock_on_paid_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  begin
    perform public.airs_report_unlock_rewards(new.user_id::text, 'ledger-entry:' || new.id::text);
  exception when others then
    raise warning 'AIRS_REPORT_UNLOCK_FAILED for ledger entry %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.airs_report_unlock_on_paid_entry()
  from public, anon, authenticated;

drop trigger if exists airs_report_unlock_on_paid_entry on public.airs_ledger_entries;
create trigger airs_report_unlock_on_paid_entry
after insert on public.airs_ledger_entries
for each row
when (new.source_kind in ('allied_commerce', 'admin_airs_report') and new.airs_delta > 0)
execute function public.airs_report_unlock_on_paid_entry();

-- ─── Claim now unlocks ──────────────────────────────────────────────────────

-- Replaces the 20261027_0004 version: after releasing the reports it runs the unlock
-- check. p_user_id is the application user (public.users.id as text) of the session.
-- p_email_confirmed comes from the verified session; the database checks the
-- stored user too, so a caller cannot claim with an unconfirmed email.
create or replace function public.marketplace_claim_airs_reports(
  p_user_id text,
  p_session_email text,
  p_email_confirmed boolean,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c_reward constant integer := 5;
  v_email text := lower(btrim(coalesce(p_session_email, '')));
  v_user public.users;
  v_report public.airs_reports;
  v_after public.airs_reports;
  v_entry_id uuid;
  v_project_account text;
  v_claimed integer := 0;
  v_ids jsonb := '[]'::jsonb;
  v_reason text;
  v_waiting boolean;
begin
  if nullif(btrim(coalesce(p_user_id, '')), '') is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or char_length(v_email) > 320
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'AIRS_REPORT_INPUT_INVALID');
  end if;

  select exists (
    select 1 from public.airs_reports report
    where report.status = 'awaiting_claim' and report.recipient_email = v_email
  ) into v_waiting;

  if not v_waiting then
    return jsonb_build_object('ok', true, 'claimed', 0, 'reportIds', '[]'::jsonb);
  end if;

  select * into v_user from public.users app_user where app_user.id::text = btrim(p_user_id);

  if v_user.id is null then
    v_reason := 'AIRS_REPORT_CLAIM_USER_NOT_FOUND';
  elsif not coalesce(p_email_confirmed, false) then
    v_reason := 'AIRS_REPORT_CLAIM_EMAIL_NOT_CONFIRMED';
  elsif lower(btrim(coalesce(v_user.email, ''))) <> v_email
    or v_user.email_verified is distinct from true
  then
    v_reason := 'AIRS_REPORT_CLAIM_EMAIL_MISMATCH';
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      'system', 'airs-report-claim', '{}'::text[], 'airs_report.claim_denied',
      null, null, btrim(p_request_id), 'denied', v_reason, null, null,
      jsonb_build_object('userId', btrim(p_user_id))
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  -- One claim per email at a time: a retried sign-in cannot credit twice.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('airs-report-claim:' || v_email, 0)
  );

  for v_report in
    select * from public.airs_reports report
    where report.status = 'awaiting_claim' and report.recipient_email = v_email
    order by report.submitted_at, report.id
    for update
  loop
    if v_report.approved_snapshot_hash is distinct from v_report.snapshot_hash
      or public.airs_report_current_hash(v_report) <> v_report.snapshot_hash
    then
      perform public.airs_report_audit(
        'system', 'airs-report-claim', '{}'::text[], 'airs_report.claim_denied',
        v_report.id, v_report.project_id, btrim(p_request_id), 'denied',
        'AIRS_REPORT_SNAPSHOT_MISMATCH', public.airs_report_json(v_report), null,
        jsonb_build_object('userId', v_user.id::text)
      );
      continue;
    end if;

    v_entry_id := public.airs_report_write_ledger(
      v_user.id::text,
      'airs-report:' || v_report.id::text || ':recipient',
      v_report.amount,
      v_report,
      v_report.concept
    );

    update public.airs_reports
    set status = 'released',
        recipient_user_id = v_user.id::text,
        ledger_entry_id = v_entry_id,
        released_at = timezone('utc', now())
    where id = v_report.id
    returning * into v_after;

    select nullif(btrim(coalesce(project.project_account_user_id, '')), '')
      into v_project_account
    from public.projects project
    where project.id = v_report.project_id;

    insert into public.airs_report_rewards (
      report_id, kind, amount, status, beneficiary_issuer, beneficiary_subject,
      beneficiary_user_id, idempotency_key
    ) values
      (
        v_report.id, 'submitter', c_reward, 'locked',
        v_report.submitted_by_issuer, v_report.submitted_by_subject, null,
        'airs-report:' || v_report.id::text || ':issuer-reward'
      ),
      (
        v_report.id, 'project', c_reward, 'locked',
        null, null, v_project_account,
        'airs-report:' || v_report.id::text || ':project-reward'
      )
    on conflict do nothing;

    perform public.airs_report_audit(
      'system', 'airs-report-claim', '{}'::text[], 'airs_report.claimed',
      v_after.id, v_after.project_id, btrim(p_request_id), 'allowed', null,
      public.airs_report_json(v_report), public.airs_report_json(v_after),
      jsonb_build_object('userId', v_user.id::text, 'ledgerEntryId', v_entry_id)
    );

    v_claimed := v_claimed + 1;
    v_ids := v_ids || to_jsonb(v_after.id);
  end loop;

  -- The granted Airs count toward the 20 paid Airs, so a first grant of 20 or more
  -- unlocks both rewards right away.
  if v_claimed > 0 then
    perform public.airs_report_unlock_rewards(v_user.id::text, btrim(p_request_id));
  end if;

  return jsonb_build_object('ok', true, 'claimed', v_claimed, 'reportIds', v_ids);
end;
$$;

revoke all on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  to service_role;

commit;
