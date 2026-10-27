-- Issue #249 B7: claiming Airs granted before the recipient had an account.
--
-- A report for an email without a verified account waits in awaiting_claim (see
-- 20261027_0003). When that person signs in with a CONFIRMED email, the reports
-- waiting for that email are released: the recipient is credited and the two
-- rewards are created as locked. Nothing is credited to the submitter or the
-- project in this cut; unlocking them is a separate change, but the rows exist so
-- no data has to be migrated later.
--
-- The "pending user" is the awaiting_claim report itself, keyed by its normalized
-- recipient email, so no extra table is needed.

begin;

-- ─── Locked rewards ─────────────────────────────────────────────────────────

create table public.airs_report_rewards (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.airs_reports(id) on delete restrict,
  kind text not null,
  amount integer not null,
  status text not null default 'locked',
  -- The submitter is an admin identity (issuer + subject); the project reward goes
  -- to the project's own Airs account (public.projects.project_account_user_id).
  beneficiary_issuer text,
  beneficiary_subject text,
  beneficiary_user_id text,
  idempotency_key text not null,
  ledger_entry_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  credited_at timestamptz,
  voided_at timestamptz,
  constraint airs_report_rewards_kind_chk check (kind in ('submitter', 'project')),
  constraint airs_report_rewards_amount_chk check (amount > 0),
  constraint airs_report_rewards_status_chk check (status in ('locked', 'credited', 'void')),
  constraint airs_report_rewards_beneficiary_chk check (
    kind = 'project'
    or (
      nullif(btrim(coalesce(beneficiary_issuer, '')), '') is not null
      and nullif(btrim(coalesce(beneficiary_subject, '')), '') is not null
    )
  ),
  constraint airs_report_rewards_key_chk check (char_length(btrim(idempotency_key)) > 0)
);

create unique index airs_report_rewards_key_uidx
  on public.airs_report_rewards (idempotency_key);
create unique index airs_report_rewards_report_kind_uidx
  on public.airs_report_rewards (report_id, kind);

alter table public.airs_report_rewards enable row level security;
revoke all on table public.airs_report_rewards from public, anon, authenticated;
grant select on table public.airs_report_rewards to service_role;

-- A report reversed before its rewards unlock voids them.
create or replace function public.airs_report_void_locked_rewards()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'reversed' and old.status is distinct from 'reversed' then
    update public.airs_report_rewards
    set status = 'void',
        voided_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where report_id = new.id
      and status = 'locked';
  end if;
  return new;
end;
$$;

revoke all on function public.airs_report_void_locked_rewards() from public, anon, authenticated;

create trigger airs_reports_void_rewards
after update of status on public.airs_reports
for each row execute function public.airs_report_void_locked_rewards();

-- ─── Claim ──────────────────────────────────────────────────────────────────

-- p_user_id is the application user (public.users.id as text) of the session.
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

  return jsonb_build_object('ok', true, 'claimed', v_claimed, 'reportIds', v_ids);
end;
$$;

revoke all on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  to service_role;

commit;
