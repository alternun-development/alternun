-- Issue #249 B18: project types.
--
-- A commerce type for each project (hotel, restaurant, ...), separate from the impact
-- category in project_categories. Each type says whether the reports of its projects need
-- a document number. Super Admins manage the catalog through the API (service role only);
-- RLS stays deny-all like every marketplace table.
--
-- A project without a type keeps the rule agreed for the first cut: the document number is
-- required. So nothing already published becomes easier to report on, and the type can be
-- assigned project by project.

begin;

create table public.project_types (
  code text primary key,
  labels jsonb not null,
  requires_document_number boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_types_code_chk check (code ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint project_types_labels_chk check (
    jsonb_typeof(labels) = 'object'
    and labels ? 'en'
    and char_length(btrim(labels ->> 'en')) between 1 and 120
  )
);

create index project_types_active_idx on public.project_types (is_active, sort_order);

alter table public.project_types enable row level security;
revoke all on table public.project_types from public, anon, authenticated;
grant select, insert, update on table public.project_types to service_role;

insert into public.project_types (code, labels, requires_document_number, sort_order)
values
  ('hotel', '{"es":"Hotel","en":"Hotel"}'::jsonb, true, 10),
  ('restaurant', '{"es":"Restaurante","en":"Restaurant"}'::jsonb, true, 20),
  ('cafe', '{"es":"Caf\u00e9","en":"Caf\u00e9"}'::jsonb, true, 30),
  ('retail_store', '{"es":"Tienda","en":"Retail store"}'::jsonb, true, 40),
  ('tourism_operator', '{"es":"Operador tur\u00edstico","en":"Tourism operator"}'::jsonb, false, 50),
  ('events_sports', '{"es":"Eventos y deportes","en":"Events and sports"}'::jsonb, false, 60),
  ('other', '{"es":"Otro","en":"Other"}'::jsonb, false, 999);

alter table public.projects
  add column project_type_code text references public.project_types(code) on delete restrict;

create index projects_project_type_idx on public.projects (project_type_code);

-- True when reports of this project need a document number: the project has no type, or its
-- type asks for one.
create or replace function public.marketplace_project_requires_document(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select project_type.requires_document_number
      from public.projects project
      join public.project_types project_type on project_type.code = project.project_type_code
      where project.id = p_project_id
    ),
    true
  );
$$;

revoke all on function public.marketplace_project_requires_document(uuid)
  from public, anon, authenticated;
grant execute on function public.marketplace_project_requires_document(uuid) to service_role;

-- The submit function is replaced with one change: the document check above.
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
    elsif v_document_number is null
      and public.marketplace_project_requires_document(p_project_id)
    then
      -- Each project type says whether its reports need a document number (an invoice, for
      -- example). A project without a type keeps the earlier rule: the number is required.
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

commit;
