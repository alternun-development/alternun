-- Issue #249 Part B: User Airs Reports.
--
-- Project admins and moderators report Airs for a recipient. A report is frozen
-- at submit (snapshot + SHA-256), approved automatically while the recipient
-- stays within the daily and monthly limits, or waits for an allowlisted Grant
-- Approver. Approval credits an existing verified account; otherwise the report
-- waits for the recipient to claim it.
--
-- Approver emails are not in this migration: operators fill
-- public.airs_report_approvers per environment.

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

commit;
