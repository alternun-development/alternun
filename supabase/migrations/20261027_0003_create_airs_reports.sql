-- Issue #249 Part B: User Airs Reports.
--
-- Project admins and moderators report Airs for a recipient. A report is frozen
-- at submit (snapshot + SHA-256), approved automatically while the recipient
-- stays within the daily and monthly limits, or waits for an allowlisted Grant
-- Approver. Approval credits an existing verified account; otherwise the report
-- waits for the recipient to claim it.
--
-- Every transition goes through one security-definer function, executable only
-- by service_role, and is written to admin_audit_log. Approver emails are not in
-- this migration: operators fill public.airs_report_approvers per environment.

begin;

-- ─── Configuration ──────────────────────────────────────────────────────────

create table public.airs_report_settings (
  id boolean primary key default true,
  daily_limit integer not null,
  monthly_limit integer not null,
  time_zone text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint airs_report_settings_singleton_chk check (id),
  constraint airs_report_settings_limits_chk check (daily_limit > 0 and monthly_limit >= daily_limit),
  constraint airs_report_settings_time_zone_chk check (char_length(btrim(time_zone)) > 0)
);

insert into public.airs_report_settings (id, daily_limit, monthly_limit, time_zone)
values (true, 100, 300, 'America/Bogota')
on conflict (id) do nothing;

create table public.airs_report_approvers (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint airs_report_approvers_email_chk check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

comment on table public.airs_report_approvers is
  'Grant Approver allowlist by normalized email. Filled per environment outside the repository.';

-- ─── Reports ────────────────────────────────────────────────────────────────

create table public.airs_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  status text not null,
  recipient_email text not null,
  recipient_name text,
  amount integer not null,
  concept text not null,
  medal_id uuid,
  document_number text,
  document_sha256 text,
  submitted_by_issuer text not null,
  submitted_by_subject text not null,
  submitted_at timestamptz not null default timezone('utc', now()),
  request_id text not null,
  snapshot jsonb not null,
  snapshot_hash text not null,
  decision_kind text,
  decision_outcome text,
  decided_by_issuer text,
  decided_by_subject text,
  decided_at timestamptz,
  decision_reason text,
  approved_snapshot_hash text,
  recipient_user_id text,
  ledger_entry_id uuid,
  released_at timestamptz,
  cancelled_by_issuer text,
  cancelled_by_subject text,
  cancelled_at timestamptz,
  cancellation_reason text,
  reversed_by_issuer text,
  reversed_by_subject text,
  reversed_at timestamptz,
  reversal_reason text,
  reversal_ledger_entry_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint airs_reports_status_chk check (status in (
    'draft', 'auto_approved', 'pending_approval', 'approved', 'awaiting_claim',
    'released', 'rejected', 'cancelled', 'reversed'
  )),
  constraint airs_reports_recipient_email_chk check (
    recipient_email = lower(btrim(recipient_email))
    and char_length(recipient_email) <= 320
    and recipient_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint airs_reports_recipient_name_chk check (
    recipient_name is null or char_length(btrim(recipient_name)) between 1 and 120
  ),
  constraint airs_reports_amount_chk check (amount > 0),
  constraint airs_reports_concept_chk check (char_length(btrim(concept)) between 10 and 500),
  constraint airs_reports_document_number_chk check (
    document_number is null or char_length(btrim(document_number)) between 1 and 80
  ),
  constraint airs_reports_document_sha256_chk check (
    document_sha256 is null or document_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint airs_reports_submitter_chk check (
    nullif(btrim(submitted_by_issuer), '') is not null
    and nullif(btrim(submitted_by_subject), '') is not null
    and nullif(btrim(request_id), '') is not null
  ),
  constraint airs_reports_snapshot_hash_chk check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  constraint airs_reports_decision_chk check (
    (decision_kind is null and decision_outcome is null and decided_at is null)
    or (
      decision_kind in ('auto', 'manual')
      and decision_outcome in ('approved', 'rejected')
      and decided_at is not null
    )
  )
);

create unique index airs_reports_submit_request_uidx
  on public.airs_reports (submitted_by_issuer, submitted_by_subject, request_id);
create index airs_reports_project_idx
  on public.airs_reports (project_id, submitted_at desc);
create index airs_reports_recipient_idx
  on public.airs_reports (recipient_email, submitted_at desc);
create index airs_reports_status_idx
  on public.airs_reports (status, submitted_at desc);

create or replace function public.airs_report_snapshot(
  p_project_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_amount integer,
  p_concept text,
  p_medal_id uuid,
  p_document_number text,
  p_document_sha256 text,
  p_submitted_by_issuer text,
  p_submitted_by_subject text,
  p_submitted_at timestamptz
)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'projectId', p_project_id,
    'recipientEmail', p_recipient_email,
    'recipientName', p_recipient_name,
    'amount', p_amount,
    'concept', p_concept,
    'medalId', p_medal_id,
    'documentNumber', p_document_number,
    'documentSha256', p_document_sha256,
    'submittedBy', jsonb_build_object(
      'issuer', p_submitted_by_issuer,
      'subject', p_submitted_by_subject
    ),
    'submittedAt', to_char(p_submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
$$;

create or replace function public.airs_report_hash(p_snapshot jsonb)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
$$;

-- Rebuilds the snapshot from the stored columns, so any change to a frozen
-- column changes the hash even if the guard trigger were bypassed.
create or replace function public.airs_report_current_hash(p_report public.airs_reports)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select public.airs_report_hash(public.airs_report_snapshot(
    p_report.project_id, p_report.recipient_email, p_report.recipient_name,
    p_report.amount, p_report.concept, p_report.medal_id, p_report.document_number,
    p_report.document_sha256, p_report.submitted_by_issuer, p_report.submitted_by_subject,
    p_report.submitted_at
  ));
$$;

create or replace function public.airs_reports_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AIRS_REPORT_DELETE_DENIED' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'auto_approved', 'pending_approval')
      or new.snapshot is distinct from public.airs_report_snapshot(
        new.project_id, new.recipient_email, new.recipient_name, new.amount, new.concept,
        new.medal_id, new.document_number, new.document_sha256, new.submitted_by_issuer,
        new.submitted_by_subject, new.submitted_at
      )
      or new.snapshot_hash is distinct from public.airs_report_hash(new.snapshot)
    then
      raise exception 'AIRS_REPORT_SNAPSHOT_INVALID' using errcode = '23514';
    end if;
    return new;
  end if;

  if (
    old.project_id, old.recipient_email, old.recipient_name, old.amount, old.concept,
    old.medal_id, old.document_number, old.document_sha256, old.submitted_by_issuer,
    old.submitted_by_subject, old.submitted_at, old.request_id, old.snapshot, old.snapshot_hash
  ) is distinct from (
    new.project_id, new.recipient_email, new.recipient_name, new.amount, new.concept,
    new.medal_id, new.document_number, new.document_sha256, new.submitted_by_issuer,
    new.submitted_by_subject, new.submitted_at, new.request_id, new.snapshot, new.snapshot_hash
  ) then
    raise exception 'AIRS_REPORT_SNAPSHOT_IMMUTABLE' using errcode = '23514';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('auto_approved', 'pending_approval', 'cancelled'))
    or (old.status = 'auto_approved' and new.status = 'approved')
    or (old.status = 'pending_approval' and new.status in ('approved', 'rejected', 'cancelled'))
    or (old.status = 'approved' and new.status in ('released', 'awaiting_claim'))
    or (old.status = 'awaiting_claim' and new.status in ('released', 'cancelled'))
    or (old.status = 'released' and new.status = 'reversed')
  ) then
    raise exception 'AIRS_REPORT_TRANSITION_INVALID' using errcode = '23514';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger airs_reports_guard_write
before insert or update or delete on public.airs_reports
for each row execute function public.airs_reports_guard();

-- ─── Ledger and notification vocabulary ─────────────────────────────────────

alter table public.airs_ledger_entries
  drop constraint if exists airs_ledger_entries_source_kind_chk;

alter table public.airs_ledger_entries
  add constraint airs_ledger_entries_source_kind_chk check (
    source_kind in (
      'allied_commerce',
      'validated_regenerative_action',
      'compensation',
      'profile_completion_bonus',
      'correction',
      'referral_bonus',
      'admin_airs_report',
      'admin_airs_report_reward'
    )
  );

alter table public.user_notifications
  drop constraint if exists user_notifications_event_type_chk;

alter table public.user_notifications
  add constraint user_notifications_event_type_chk check (
    event_type in (
      'registration_completed',
      'airs_credited',
      'referral_confirmed',
      'wallet_connected',
      'profile_completed',
      'airs_report_submitted',
      'airs_report_pending_approval',
      'airs_report_approved',
      'airs_report_rejected',
      'airs_report_released',
      'airs_report_rewards_unlocked'
    )
  );

-- ─── Internal helpers (not executable by any client role) ───────────────────

create or replace function public.airs_report_json(p_report public.airs_reports)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', p_report.id,
    'projectId', p_report.project_id,
    'status', p_report.status,
    'recipientEmail', p_report.recipient_email,
    'recipientName', p_report.recipient_name,
    'recipientUserId', p_report.recipient_user_id,
    'amount', p_report.amount,
    'concept', p_report.concept,
    'medalId', p_report.medal_id,
    'documentNumber', p_report.document_number,
    'documentSha256', p_report.document_sha256,
    'snapshotHash', p_report.snapshot_hash,
    'submittedBy', jsonb_build_object(
      'issuer', p_report.submitted_by_issuer,
      'subject', p_report.submitted_by_subject
    ),
    'submittedAt', p_report.submitted_at,
    'decision', case
      when p_report.decided_at is null then null
      else jsonb_build_object(
        'kind', p_report.decision_kind,
        'outcome', p_report.decision_outcome,
        'decidedAt', p_report.decided_at,
        'decidedBy', case
          when p_report.decided_by_issuer is null then null
          else jsonb_build_object(
            'issuer', p_report.decided_by_issuer,
            'subject', p_report.decided_by_subject
          )
        end,
        'reason', p_report.decision_reason
      )
    end,
    'releasedAt', p_report.released_at,
    'ledgerEntryId', p_report.ledger_entry_id,
    'cancelledAt', p_report.cancelled_at,
    'cancellationReason', p_report.cancellation_reason,
    'reversedAt', p_report.reversed_at,
    'reversalReason', p_report.reversal_reason,
    'updatedAt', p_report.updated_at
  );
$$;

-- Totals for the recipient on the calendar day and month of p_at, in the
-- configured time zone, across every project and every report that can still
-- be or already was credited.
create or replace function public.airs_report_recipient_totals(
  p_recipient_email text,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_settings public.airs_report_settings;
  v_local timestamp;
  v_daily bigint;
  v_monthly bigint;
begin
  select * into v_settings from public.airs_report_settings where id;
  if not found then
    raise exception 'AIRS_REPORT_SETTINGS_MISSING' using errcode = 'P0001';
  end if;

  v_local := p_at at time zone v_settings.time_zone;

  select
    coalesce(sum(report.amount) filter (
      where date_trunc('day', report.submitted_at at time zone v_settings.time_zone)
        = date_trunc('day', v_local)
    ), 0),
    coalesce(sum(report.amount), 0)
  into v_daily, v_monthly
  from public.airs_reports report
  where report.recipient_email = lower(btrim(p_recipient_email))
    and report.status in (
      'auto_approved', 'pending_approval', 'approved', 'awaiting_claim', 'released'
    )
    and date_trunc('month', report.submitted_at at time zone v_settings.time_zone)
      = date_trunc('month', v_local);

  return jsonb_build_object(
    'timeZone', v_settings.time_zone,
    'day', to_char(v_local, 'YYYY-MM-DD'),
    'month', to_char(v_local, 'YYYY-MM'),
    'dailyTotal', v_daily,
    'monthlyTotal', v_monthly,
    'dailyLimit', v_settings.daily_limit,
    'monthlyLimit', v_settings.monthly_limit
  );
end;
$$;

create or replace function public.airs_report_audit(
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_action text,
  p_report_id uuid,
  p_project_id uuid,
  p_request_id text,
  p_result text,
  p_reason_code text,
  p_before jsonb,
  p_after jsonb,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_enterprise_id uuid;
begin
  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = p_project_id
  order by relation.is_primary desc, relation.enterprise_id
  limit 1;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, reason_code,
    before_state, after_state, metadata
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    p_action, 'airs_report', p_report_id, v_enterprise_id,
    case when exists (select 1 from public.projects where id = p_project_id)
      then p_project_id else null end,
    p_request_id, p_result, p_reason_code, p_before, p_after,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- Submitters: super admins on any project; Project Admins and Project
-- Moderators on the projects they are scoped to.
create or replace function public.airs_report_can_submit(
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_project_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin'] then
    return true;
  end if;

  if not coalesce(p_actor_roles, '{}'::text[]) && array['partner_operator', 'sub_admin'] then
    return false;
  end if;

  return exists (
    select 1
    from public.enterprise_projects relation
    where relation.project_id = p_project_id
      and public.marketplace_actor_has_scope(
        p_actor_issuer, p_actor_subject, p_actor_roles,
        relation.enterprise_id, p_project_id,
        array['partner_operator', 'sub_admin']
      )
  );
end;
$$;

create or replace function public.airs_report_is_approver(
  p_actor_email text,
  p_actor_email_verified boolean
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(p_actor_email_verified, false)
    and exists (
      select 1
      from public.airs_report_approvers approver
      where approver.email = lower(btrim(coalesce(p_actor_email, '')))
        and approver.is_active
    );
$$;

create or replace function public.airs_report_find_recipient(p_email text)
returns public.users
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select app_user.*
  from public.users app_user
  where lower(btrim(app_user.email)) = lower(btrim(p_email))
    and app_user.email_verified = true
  order by app_user.created_at, app_user.id
  limit 1;
$$;

create or replace function public.airs_report_write_ledger(
  p_user_id text,
  p_idempotency_key text,
  p_delta numeric,
  p_report public.airs_reports,
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
    'admin_airs_report',
    'airs-report:' || p_report.id::text,
    p_idempotency_key,
    'AIRS',
    abs(p_delta),
    1::numeric,
    p_delta,
    p_notes,
    jsonb_build_object(
      'projectId', p_report.project_id,
      'airsReportId', p_report.id,
      'snapshotHash', p_report.snapshot_hash
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

-- approved → released (existing verified account) or awaiting_claim.
-- Called inside submit and approve; the caller holds the row lock.
create or replace function public.airs_report_settle(
  p_report_id uuid,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns public.airs_reports
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_recipient public.users;
  v_entry_id uuid;
begin
  select * into v_before from public.airs_reports where id = p_report_id for update;
  if v_before.status <> 'approved' then
    raise exception 'AIRS_REPORT_TRANSITION_INVALID' using errcode = '23514';
  end if;

  v_recipient := public.airs_report_find_recipient(v_before.recipient_email);

  if v_recipient.id is null then
    update public.airs_reports set status = 'awaiting_claim'
    where id = v_before.id
    returning * into v_after;

    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.awaiting_claim',
      v_after.id, v_after.project_id, p_request_id, 'allowed', null,
      public.airs_report_json(v_before), public.airs_report_json(v_after), '{}'::jsonb
    );
    return v_after;
  end if;

  v_entry_id := public.airs_report_write_ledger(
    v_recipient.id::text,
    'airs-report:' || v_before.id::text || ':recipient',
    v_before.amount,
    v_before,
    v_before.concept
  );

  update public.airs_reports
  set status = 'released',
      recipient_user_id = v_recipient.id::text,
      ledger_entry_id = v_entry_id,
      released_at = timezone('utc', now())
  where id = v_before.id
  returning * into v_after;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.released',
    v_after.id, v_after.project_id, p_request_id, 'allowed', null,
    public.airs_report_json(v_before), public.airs_report_json(v_after),
    jsonb_build_object('ledgerEntryId', v_entry_id)
  );
  return v_after;
end;
$$;

-- Replays a transition already performed with the same actor and request id.
create or replace function public.airs_report_replay(
  p_action text,
  p_actor_issuer text,
  p_actor_subject text,
  p_request_id text,
  p_report_id uuid
)
returns public.airs_reports
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select report.*
  from public.admin_audit_log audit
  join public.airs_reports report on report.id = audit.target_id
  where audit.action = p_action
    and audit.result = 'allowed'
    and audit.actor_issuer = p_actor_issuer
    and audit.actor_subject = p_actor_subject
    and audit.request_id = p_request_id
    and audit.target_id = p_report_id
  order by audit.occurred_at desc
  limit 1;
$$;

-- ─── Transitions ────────────────────────────────────────────────────────────

create or replace function public.marketplace_submit_airs_report(
  p_project_id uuid,
  p_recipient_email text,
  p_recipient_name text,
  p_amount integer,
  p_concept text,
  p_medal_id uuid,
  p_document_number text,
  p_document_sha256 text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_actor_email text,
  p_actor_email_verified boolean,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_project public.projects;
  v_report public.airs_reports;
  v_actor_email text := lower(btrim(coalesce(p_actor_email, '')));
  v_auto_blocked text;
  v_email text := lower(btrim(coalesce(p_recipient_email, '')));
  v_name text := nullif(btrim(coalesce(p_recipient_name, '')), '');
  v_document_number text := nullif(btrim(coalesce(p_document_number, '')), '');
  v_recipient public.users;
  v_totals jsonb;
  v_daily bigint;
  v_monthly bigint;
  v_auto boolean;
  v_submitted_at timestamptz := timezone('utc', now());
  v_snapshot jsonb;
  v_reason text;
begin
  if p_project_id is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or char_length(v_email) > 320
    or p_amount is null or p_amount <= 0
    or char_length(btrim(coalesce(p_concept, ''))) not between 10 and 500
    or (v_name is not null and char_length(v_name) > 120)
    or (v_document_number is not null and char_length(v_document_number) > 80)
    or (p_document_sha256 is not null and p_document_sha256 !~ '^[0-9a-f]{64}$')
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or array_position(p_actor_roles, null) is not null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    select * into v_report
    from public.airs_reports report
    where report.submitted_by_issuer = btrim(p_actor_issuer)
      and report.submitted_by_subject = btrim(p_actor_subject)
      and report.request_id = btrim(p_request_id);

    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'report', public.airs_report_json(v_report),
        'autoApproval', jsonb_build_object(
          'approved', coalesce(v_report.decision_kind = 'auto', false),
          'blockedReason', (
            select audit.metadata ->> 'autoApprovalBlockedReason'
            from public.admin_audit_log audit
            where audit.action = 'airs_report.submitted' and audit.target_id = v_report.id
            limit 1
          ),
          'totals', public.airs_report_recipient_totals(v_report.recipient_email, v_report.submitted_at)
        )
      );
    end if;

    select * into v_project from public.projects where id = p_project_id;
    if v_project.id is null then
      v_reason := 'PROJECT_NOT_FOUND';
    elsif v_project.status = 'archived' then
      v_reason := 'PROJECT_ARCHIVED';
    elsif not public.airs_report_can_submit(
      p_actor_issuer, p_actor_subject, p_actor_roles, p_project_id
    ) then
      v_reason := case
        when coalesce(p_actor_roles, '{}'::text[]) && array['partner_operator', 'sub_admin']
          then 'PROJECT_SCOPE_DENIED'
        else 'PERMISSION_DENIED'
      end;
    elsif p_medal_id is not null then
      v_reason := 'AIRS_REPORT_MEDAL_UNAVAILABLE';
    elsif v_document_number is null then
      -- Agreed for now: every report carries a document number; the file is optional.
      v_reason := 'AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED';
    end if;
  end if;

  if v_reason is null then
    v_recipient := public.airs_report_find_recipient(v_email);
    if v_recipient.id is null and v_name is null then
      v_reason := 'AIRS_REPORT_RECIPIENT_NAME_REQUIRED';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.submit_denied',
      null, p_project_id, p_request_id, 'denied', v_reason, null, null,
      jsonb_build_object('requestedProjectId', p_project_id, 'amount', p_amount)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  -- One recipient at a time: concurrent reports cannot both pass the limits.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('airs-report-recipient:' || v_email, 0)
  );

  v_totals := public.airs_report_recipient_totals(v_email, v_submitted_at);
  v_daily := (v_totals ->> 'dailyTotal')::bigint + p_amount;
  v_monthly := (v_totals ->> 'monthlyTotal')::bigint + p_amount;
  v_totals := v_totals || jsonb_build_object('dailyTotal', v_daily, 'monthlyTotal', v_monthly);

  -- A report to the submitter's own account always waits for an approver. The
  -- submitter is identified by the verified token email or by the recipient
  -- account's issuer and subject; without a verified email that cannot be ruled
  -- out, so the report waits as well.
  if (v_actor_email <> '' and v_actor_email = v_email)
    or exists (
      select 1
      from public.users app_user
      where lower(btrim(app_user.email)) = v_email
        and app_user.iss = btrim(p_actor_issuer)
        and app_user.sub = btrim(p_actor_subject)
    )
  then
    v_auto_blocked := 'SELF_REPORT';
  elsif v_actor_email = '' or not coalesce(p_actor_email_verified, false) then
    v_auto_blocked := 'SUBMITTER_EMAIL_UNVERIFIED';
  end if;

  v_auto := v_auto_blocked is null
    and v_daily <= (v_totals ->> 'dailyLimit')::bigint
    and v_monthly <= (v_totals ->> 'monthlyLimit')::bigint;

  v_snapshot := public.airs_report_snapshot(
    p_project_id, v_email, v_name, p_amount, btrim(p_concept), null,
    v_document_number, p_document_sha256, btrim(p_actor_issuer), btrim(p_actor_subject),
    v_submitted_at
  );

  insert into public.airs_reports (
    project_id, status, recipient_email, recipient_name, amount, concept, medal_id,
    document_number, document_sha256, submitted_by_issuer, submitted_by_subject,
    submitted_at, request_id, snapshot, snapshot_hash
  ) values (
    p_project_id,
    case when v_auto then 'auto_approved' else 'pending_approval' end,
    v_email, v_name, p_amount, btrim(p_concept), null,
    v_document_number, p_document_sha256, btrim(p_actor_issuer), btrim(p_actor_subject),
    v_submitted_at, btrim(p_request_id), v_snapshot, public.airs_report_hash(v_snapshot)
  ) returning * into v_report;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.submitted',
    v_report.id, p_project_id, p_request_id, 'allowed', null, null,
    public.airs_report_json(v_report),
    jsonb_build_object('totals', v_totals, 'autoApprovalBlockedReason', v_auto_blocked)
  );

  if v_auto then
    update public.airs_reports
    set status = 'approved',
        decision_kind = 'auto',
        decision_outcome = 'approved',
        decided_at = timezone('utc', now()),
        approved_snapshot_hash = snapshot_hash
    where id = v_report.id
    returning * into v_report;

    perform public.airs_report_audit(
      'system', 'airs-report-auto-approval', '{}'::text[], 'airs_report.auto_approved',
      v_report.id, p_project_id, p_request_id, 'allowed', null, null,
      public.airs_report_json(v_report), jsonb_build_object('totals', v_totals)
    );

    v_report := public.airs_report_settle(
      v_report.id, 'system', 'airs-report-auto-approval', '{}'::text[], p_request_id
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'report', public.airs_report_json(v_report),
    'autoApproval', jsonb_build_object(
      'approved', v_auto, 'blockedReason', v_auto_blocked, 'totals', v_totals
    )
  );
end;
$$;

create or replace function public.marketplace_approve_airs_report(
  p_report_id uuid,
  p_snapshot_hash text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_actor_email text,
  p_actor_email_verified boolean,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_reason text;
begin
  if p_report_id is null
    or coalesce(p_snapshot_hash, '') !~ '^[0-9a-f]{64}$'
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    v_after := public.airs_report_replay(
      'airs_report.approved', p_actor_issuer, p_actor_subject, p_request_id, p_report_id
    );
    if v_after.id is not null then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'report', public.airs_report_json(v_after)
      );
    end if;

    select * into v_before from public.airs_reports where id = p_report_id for update;
    if v_before.id is null then
      v_reason := 'AIRS_REPORT_NOT_FOUND';
    elsif not public.airs_report_is_approver(p_actor_email, p_actor_email_verified) then
      v_reason := 'AIRS_REPORT_APPROVER_NOT_ALLOWED';
    elsif (v_before.submitted_by_issuer = btrim(p_actor_issuer)
        and v_before.submitted_by_subject = btrim(p_actor_subject))
      or v_before.recipient_email = lower(btrim(coalesce(p_actor_email, '')))
    then
      v_reason := 'AIRS_REPORT_SELF_APPROVAL_DENIED';
    elsif v_before.status <> 'pending_approval' then
      v_reason := 'AIRS_REPORT_TRANSITION_INVALID';
    elsif public.airs_report_current_hash(v_before) <> v_before.snapshot_hash
      or v_before.snapshot_hash <> p_snapshot_hash
    then
      v_reason := 'AIRS_REPORT_SNAPSHOT_MISMATCH';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.approve_denied',
      v_before.id, v_before.project_id, p_request_id, 'denied', v_reason,
      case when v_before.id is null then null else public.airs_report_json(v_before) end,
      null, jsonb_build_object('requestedReportId', p_report_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.airs_reports
  set status = 'approved',
      decision_kind = 'manual',
      decision_outcome = 'approved',
      decided_by_issuer = btrim(p_actor_issuer),
      decided_by_subject = btrim(p_actor_subject),
      decided_at = timezone('utc', now()),
      approved_snapshot_hash = p_snapshot_hash
  where id = v_before.id
  returning * into v_after;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.approved',
    v_after.id, v_after.project_id, p_request_id, 'allowed', null,
    public.airs_report_json(v_before), public.airs_report_json(v_after),
    jsonb_build_object(
      'totals', public.airs_report_recipient_totals(v_after.recipient_email, v_after.submitted_at)
    )
  );

  v_after := public.airs_report_settle(
    v_after.id, p_actor_issuer, p_actor_subject, p_actor_roles, p_request_id
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'report', public.airs_report_json(v_after)
  );
end;
$$;

create or replace function public.marketplace_reject_airs_report(
  p_report_id uuid,
  p_reason text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_actor_email text,
  p_actor_email_verified boolean,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_reason text;
begin
  if p_report_id is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    v_after := public.airs_report_replay(
      'airs_report.rejected', p_actor_issuer, p_actor_subject, p_request_id, p_report_id
    );
    if v_after.id is not null then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'report', public.airs_report_json(v_after)
      );
    end if;

    select * into v_before from public.airs_reports where id = p_report_id for update;
    if v_before.id is null then
      v_reason := 'AIRS_REPORT_NOT_FOUND';
    elsif not public.airs_report_is_approver(p_actor_email, p_actor_email_verified) then
      v_reason := 'AIRS_REPORT_APPROVER_NOT_ALLOWED';
    elsif (v_before.submitted_by_issuer = btrim(p_actor_issuer)
        and v_before.submitted_by_subject = btrim(p_actor_subject))
      or v_before.recipient_email = lower(btrim(coalesce(p_actor_email, '')))
    then
      v_reason := 'AIRS_REPORT_SELF_APPROVAL_DENIED';
    elsif v_before.status <> 'pending_approval' then
      v_reason := 'AIRS_REPORT_TRANSITION_INVALID';
    elsif char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
      v_reason := 'AIRS_REPORT_REASON_REQUIRED';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.reject_denied',
      v_before.id, v_before.project_id, p_request_id, 'denied', v_reason,
      case when v_before.id is null then null else public.airs_report_json(v_before) end,
      null, jsonb_build_object('requestedReportId', p_report_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.airs_reports
  set status = 'rejected',
      decision_kind = 'manual',
      decision_outcome = 'rejected',
      decided_by_issuer = btrim(p_actor_issuer),
      decided_by_subject = btrim(p_actor_subject),
      decided_at = timezone('utc', now()),
      decision_reason = btrim(p_reason)
  where id = v_before.id
  returning * into v_after;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.rejected',
    v_after.id, v_after.project_id, p_request_id, 'allowed', null,
    public.airs_report_json(v_before), public.airs_report_json(v_after),
    jsonb_build_object('reason', btrim(p_reason))
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'report', public.airs_report_json(v_after)
  );
end;
$$;

-- draft and pending_approval: the submitter, a super admin, or a Project Admin
-- of the project. awaiting_claim: super admins only.
create or replace function public.marketplace_cancel_airs_report(
  p_report_id uuid,
  p_reason text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_super_admin boolean := coalesce(p_actor_roles, '{}'::text[])
    && array['platform_owner', 'internal_admin'];
  v_allowed boolean := false;
  v_reason text;
begin
  if p_report_id is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or array_position(p_actor_roles, null) is not null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    v_after := public.airs_report_replay(
      'airs_report.cancelled', p_actor_issuer, p_actor_subject, p_request_id, p_report_id
    );
    if v_after.id is not null then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'report', public.airs_report_json(v_after)
      );
    end if;

    select * into v_before from public.airs_reports where id = p_report_id for update;
    if v_before.id is null then
      v_reason := 'AIRS_REPORT_NOT_FOUND';
    elsif v_before.status not in ('draft', 'pending_approval', 'awaiting_claim') then
      v_reason := 'AIRS_REPORT_TRANSITION_INVALID';
    else
      if v_before.status = 'awaiting_claim' then
        v_allowed := v_super_admin;
      else
        v_allowed := v_super_admin
          or (v_before.submitted_by_issuer = btrim(p_actor_issuer)
            and v_before.submitted_by_subject = btrim(p_actor_subject)
            and public.airs_report_can_submit(
              p_actor_issuer, p_actor_subject, p_actor_roles, v_before.project_id
            ))
          or exists (
            select 1
            from public.enterprise_projects relation
            where relation.project_id = v_before.project_id
              and public.marketplace_actor_has_scope(
                p_actor_issuer, p_actor_subject, p_actor_roles,
                relation.enterprise_id, v_before.project_id, array['partner_operator']
              )
          );
      end if;

      if not v_allowed then
        v_reason := 'PERMISSION_DENIED';
      elsif char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
        v_reason := 'AIRS_REPORT_REASON_REQUIRED';
      end if;
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.cancel_denied',
      v_before.id, v_before.project_id, p_request_id, 'denied', v_reason,
      case when v_before.id is null then null else public.airs_report_json(v_before) end,
      null, jsonb_build_object('requestedReportId', p_report_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.airs_reports
  set status = 'cancelled',
      cancelled_by_issuer = btrim(p_actor_issuer),
      cancelled_by_subject = btrim(p_actor_subject),
      cancelled_at = timezone('utc', now()),
      cancellation_reason = btrim(p_reason)
  where id = v_before.id
  returning * into v_after;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.cancelled',
    v_after.id, v_after.project_id, p_request_id, 'allowed', null,
    public.airs_report_json(v_before), public.airs_report_json(v_after),
    jsonb_build_object('reason', btrim(p_reason))
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'report', public.airs_report_json(v_after)
  );
end;
$$;

-- Releases an approved report. A report that is already released returns
-- idempotently and never writes a second ledger entry.
create or replace function public.marketplace_release_airs_report(
  p_report_id uuid,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_reason text;
begin
  if p_report_id is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    select * into v_before from public.airs_reports where id = p_report_id for update;
    if v_before.id is null then
      v_reason := 'AIRS_REPORT_NOT_FOUND';
    elsif not coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin'] then
      v_reason := 'PERMISSION_DENIED';
    elsif v_before.status = 'released' then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'report', public.airs_report_json(v_before)
      );
    elsif v_before.status <> 'approved' then
      v_reason := 'AIRS_REPORT_TRANSITION_INVALID';
    elsif v_before.approved_snapshot_hash is distinct from v_before.snapshot_hash
      or public.airs_report_current_hash(v_before) <> v_before.snapshot_hash
    then
      v_reason := 'AIRS_REPORT_SNAPSHOT_MISMATCH';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.release_denied',
      v_before.id, v_before.project_id, p_request_id, 'denied', v_reason,
      case when v_before.id is null then null else public.airs_report_json(v_before) end,
      null, jsonb_build_object('requestedReportId', p_report_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  v_after := public.airs_report_settle(
    v_before.id, p_actor_issuer, p_actor_subject, p_actor_roles, p_request_id
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'report', public.airs_report_json(v_after)
  );
end;
$$;

-- released → reversed, platform_owner only. Writes one negative ledger entry.
create or replace function public.marketplace_reverse_airs_report(
  p_report_id uuid,
  p_reason text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_entry_id uuid;
  v_reason text;
begin
  if p_report_id is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  end if;

  if v_reason is null then
    select * into v_before from public.airs_reports where id = p_report_id for update;
    if v_before.id is null then
      v_reason := 'AIRS_REPORT_NOT_FOUND';
    elsif not 'platform_owner' = any(coalesce(p_actor_roles, '{}'::text[])) then
      v_reason := 'PERMISSION_DENIED';
    elsif v_before.status = 'reversed' then
      return jsonb_build_object(
        'ok', true, 'idempotent', true, 'report', public.airs_report_json(v_before)
      );
    elsif v_before.status <> 'released' then
      v_reason := 'AIRS_REPORT_TRANSITION_INVALID';
    elsif char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
      v_reason := 'AIRS_REPORT_REASON_REQUIRED';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.reverse_denied',
      v_before.id, v_before.project_id, p_request_id, 'denied', v_reason,
      case when v_before.id is null then null else public.airs_report_json(v_before) end,
      null, jsonb_build_object('requestedReportId', p_report_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  v_entry_id := public.airs_report_write_ledger(
    v_before.recipient_user_id,
    'airs-report:' || v_before.id::text || ':reversal',
    -v_before.amount,
    v_before,
    btrim(p_reason)
  );

  update public.airs_reports
  set status = 'reversed',
      reversed_by_issuer = btrim(p_actor_issuer),
      reversed_by_subject = btrim(p_actor_subject),
      reversed_at = timezone('utc', now()),
      reversal_reason = btrim(p_reason),
      reversal_ledger_entry_id = v_entry_id
  where id = v_before.id
  returning * into v_after;

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.reversed',
    v_after.id, v_after.project_id, p_request_id, 'allowed', null,
    public.airs_report_json(v_before), public.airs_report_json(v_after),
    jsonb_build_object('reason', btrim(p_reason), 'ledgerEntryId', v_entry_id)
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'report', public.airs_report_json(v_after)
  );
end;
$$;

-- Declared for the claim contract; the claim flow lands in a separate change.
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
begin
  return jsonb_build_object('ok', false, 'reasonCode', 'AIRS_REPORT_CLAIM_NOT_IMPLEMENTED');
end;
$$;

-- Exact-email lookup for the report form: minimal fields, scoped to projects
-- the actor can submit for, and limited to 30 lookups per actor per 10 minutes.
create or replace function public.marketplace_lookup_airs_report_recipient(
  p_project_id uuid,
  p_email text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_recipient public.users;
  v_reason text;
  v_recent integer;
begin
  if p_project_id is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'AIRS_REPORT_INPUT_INVALID';
  elsif not exists (select 1 from public.projects where id = p_project_id) then
    v_reason := 'PROJECT_NOT_FOUND';
  elsif not public.airs_report_can_submit(
    p_actor_issuer, p_actor_subject, p_actor_roles, p_project_id
  ) then
    v_reason := 'PROJECT_SCOPE_DENIED';
  else
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        concat_ws(':', 'airs-report-lookup', p_actor_issuer, p_actor_subject), 0
      )
    );
    select count(*) into v_recent
    from public.admin_audit_log audit
    where audit.action = 'airs_report.recipient_lookup'
      and audit.actor_issuer = p_actor_issuer
      and audit.actor_subject = p_actor_subject
      and audit.occurred_at > timezone('utc', now()) - interval '10 minutes';
    if v_recent >= 30 then
      v_reason := 'AIRS_REPORT_LOOKUP_RATE_LIMITED';
    end if;
  end if;

  if v_reason is not null then
    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.recipient_lookup_denied',
      null, p_project_id, p_request_id, 'denied', v_reason, null, null, '{}'::jsonb
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  v_recipient := public.airs_report_find_recipient(v_email);

  perform public.airs_report_audit(
    p_actor_issuer, p_actor_subject, p_actor_roles, 'airs_report.recipient_lookup',
    null, p_project_id, p_request_id, 'allowed', null, null, null,
    jsonb_build_object('emailSha256', encode(sha256(convert_to(v_email, 'UTF8')), 'hex'))
  );

  return jsonb_build_object(
    'ok', true,
    'recipient', jsonb_build_object(
      'email', v_email,
      'hasAccount', v_recipient.id is not null,
      'displayName', case
        when v_recipient.id is null then null
        else nullif(btrim(coalesce(v_recipient.name, '')), '')
      end
    )
  );
end;
$$;

-- ─── Access ─────────────────────────────────────────────────────────────────

alter table public.airs_report_settings enable row level security;
alter table public.airs_report_approvers enable row level security;
alter table public.airs_reports enable row level security;

revoke all on table public.airs_report_settings from public, anon, authenticated;
revoke all on table public.airs_report_approvers from public, anon, authenticated;
revoke all on table public.airs_reports from public, anon, authenticated;

grant select on table public.airs_report_settings to service_role;
grant select on table public.airs_report_approvers to service_role;
grant select on table public.airs_reports to service_role;

revoke all on function public.airs_report_snapshot(
  uuid, text, text, integer, text, uuid, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.airs_report_hash(jsonb) from public, anon, authenticated;
revoke all on function public.airs_report_current_hash(public.airs_reports)
  from public, anon, authenticated;
revoke all on function public.airs_reports_guard() from public, anon, authenticated;
revoke all on function public.airs_report_json(public.airs_reports)
  from public, anon, authenticated;
revoke all on function public.airs_report_recipient_totals(text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.airs_report_audit(
  text, text, text[], text, uuid, uuid, text, text, text, jsonb, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function public.airs_report_can_submit(text, text, text[], uuid)
  from public, anon, authenticated;
revoke all on function public.airs_report_is_approver(text, boolean)
  from public, anon, authenticated;
revoke all on function public.airs_report_find_recipient(text) from public, anon, authenticated;
revoke all on function public.airs_report_write_ledger(
  text, text, numeric, public.airs_reports, text
) from public, anon, authenticated;
revoke all on function public.airs_report_settle(uuid, text, text, text[], text)
  from public, anon, authenticated;
revoke all on function public.airs_report_replay(text, text, text, text, uuid)
  from public, anon, authenticated;

revoke all on function public.marketplace_submit_airs_report(
  uuid, text, text, integer, text, uuid, text, text, text, text, text[], text, boolean, text
) from public, anon, authenticated;
revoke all on function public.marketplace_approve_airs_report(
  uuid, text, text, text, text[], text, boolean, text
) from public, anon, authenticated;
revoke all on function public.marketplace_reject_airs_report(
  uuid, text, text, text, text[], text, boolean, text
) from public, anon, authenticated;
revoke all on function public.marketplace_cancel_airs_report(
  uuid, text, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_release_airs_report(uuid, text, text, text[], text)
  from public, anon, authenticated;
revoke all on function public.marketplace_reverse_airs_report(
  uuid, text, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.marketplace_lookup_airs_report_recipient(
  uuid, text, text, text, text[], text
) from public, anon, authenticated;

grant execute on function public.airs_report_recipient_totals(text, timestamptz) to service_role;
grant execute on function public.marketplace_submit_airs_report(
  uuid, text, text, integer, text, uuid, text, text, text, text, text[], text, boolean, text
) to service_role;
grant execute on function public.marketplace_approve_airs_report(
  uuid, text, text, text, text[], text, boolean, text
) to service_role;
grant execute on function public.marketplace_reject_airs_report(
  uuid, text, text, text, text[], text, boolean, text
) to service_role;
grant execute on function public.marketplace_cancel_airs_report(
  uuid, text, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_release_airs_report(uuid, text, text, text[], text)
  to service_role;
grant execute on function public.marketplace_reverse_airs_report(
  uuid, text, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_claim_airs_reports(text, text, boolean, text)
  to service_role;
grant execute on function public.marketplace_lookup_airs_report_recipient(
  uuid, text, text, text, text[], text
) to service_role;

commit;
