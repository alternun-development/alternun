-- Issue #249 B17: the medal catalog of each project.
--
-- Medals are custom per client and project (a golf tournament, a race) and designed by the
-- Alternun team. Super Admins add them to a project through the API; the admins and
-- moderators of that project can only pick from its active medals when they report Airs.
-- The art is an image URL on a host that is already allowed for project images; uploading
-- files waits for the storage bucket.
--
-- A medal is awarded to the recipient when the report is released (right away for an
-- account that exists, at the claim for a new one), once per report, and is marked revoked
-- when the report is reversed.

begin;

create table public.project_medals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by_issuer text not null,
  created_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_medals_name_chk check (char_length(btrim(name)) between 1 and 80),
  constraint project_medals_description_chk check (
    description is null or char_length(description) <= 300
  ),
  constraint project_medals_image_chk check (
    image_url ~ '^https://[^[:space:]]+$' and char_length(image_url) <= 2048
  )
);

create index project_medals_project_idx on public.project_medals (project_id, is_active, sort_order);

alter table public.project_medals enable row level security;
revoke all on table public.project_medals from public, anon, authenticated;
grant select, insert, update on table public.project_medals to service_role;

-- Reports already carry a nullable medal_id (always null until now): tie it to the catalog.
alter table public.airs_reports
  add constraint airs_reports_medal_fk
  foreign key (medal_id) references public.project_medals(id) on delete restrict;

create table public.user_medals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  medal_id uuid not null references public.project_medals(id) on delete restrict,
  report_id uuid not null references public.airs_reports(id) on delete restrict,
  awarded_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  constraint user_medals_report_uidx unique (report_id),
  constraint user_medals_user_chk check (char_length(btrim(user_id)) > 0)
);

create index user_medals_user_idx on public.user_medals (user_id, awarded_at desc);

alter table public.user_medals enable row level security;
revoke all on table public.user_medals from public, anon, authenticated;
grant select on table public.user_medals to service_role;

create or replace function public.airs_report_award_medal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.medal_id is null then
    return new;
  end if;
  if new.status = 'released'
    and old.status is distinct from 'released'
    and nullif(btrim(coalesce(new.recipient_user_id, '')), '') is not null
  then
    insert into public.user_medals (user_id, medal_id, report_id)
    values (btrim(new.recipient_user_id), new.medal_id, new.id)
    on conflict (report_id) do nothing;
  elsif new.status = 'reversed' and old.status is distinct from 'reversed' then
    update public.user_medals
    set revoked_at = timezone('utc', now())
    where report_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

revoke all on function public.airs_report_award_medal() from public, anon, authenticated;

create trigger airs_reports_award_medal
after update of status on public.airs_reports
for each row execute function public.airs_report_award_medal();

-- The submit function is replaced with the medal rules: it must belong to this project and be
-- active, and it is stored in the report and its snapshot.
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
    elsif p_medal_id is not null and not exists (
      select 1
      from public.project_medals medal
      where medal.id = p_medal_id
        and medal.project_id = p_project_id
        and medal.is_active
    ) then
      -- A medal must be an active one of this very project's catalog.
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
    p_project_id, v_email, v_name, p_amount, btrim(p_concept), p_medal_id,
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
    v_email, v_name, p_amount, btrim(p_concept), p_medal_id,
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
