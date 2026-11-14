-- Clients of a project, managed from the in-app "Clients" tab.
--
-- A client with an Airs account is a project participant (project_participants). A client
-- without one is a pending invitation by email: the person is invited, and when they sign
-- up and confirm that email the invitation becomes a participant. Airs assigned to a client
-- are a User Airs Report (airs_reports), with its own approval, claim and +5/+5 rewards.
--
-- The supporting file of a report (receipt, document) lives in a PRIVATE bucket. Only the
-- API (service_role) reads it, and hands the project team a short-lived signed URL.

begin;

-- ─── Invitations ────────────────────────────────────────────────────────────

create table public.project_client_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  name text not null,
  status text not null default 'pending',
  invited_by_issuer text not null,
  invited_by_subject text not null,
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_user_id text,
  accepted_at timestamptz,
  cancelled_by_issuer text,
  cancelled_by_subject text,
  cancelled_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_client_invitations_email_chk check (
    char_length(email) between 3 and 254
    and email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint project_client_invitations_name_chk check (
    char_length(btrim(name)) between 1 and 120 and name !~ '[[:cntrl:]]'
  ),
  constraint project_client_invitations_status_chk check (
    status in ('pending', 'accepted', 'cancelled')
  ),
  constraint project_client_invitations_inviter_chk check (
    nullif(btrim(invited_by_issuer), '') is not null
    and nullif(btrim(invited_by_subject), '') is not null
  ),
  constraint project_client_invitations_state_chk check (
    (status = 'pending' and accepted_at is null and cancelled_at is null)
    or (status = 'accepted' and accepted_user_id is not null and accepted_at is not null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

create unique index project_client_invitations_pending_uidx
  on public.project_client_invitations (project_id, email)
  where status = 'pending';

create index project_client_invitations_email_idx
  on public.project_client_invitations (email)
  where status = 'pending';

create index project_client_invitations_project_idx
  on public.project_client_invitations (project_id, status, invited_at desc);

create trigger project_client_invitations_set_updated_at
before update on public.project_client_invitations
for each row execute function public.marketplace_set_updated_at();

comment on table public.project_client_invitations is
  'Clients invited by email to a project before they have an Airs account.';

alter table public.project_client_invitations enable row level security;
revoke all on table public.project_client_invitations from public, anon, authenticated;
grant select on table public.project_client_invitations to service_role;

-- ─── Supporting files of reports ────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'airs-report-proofs',
  'airs-report-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.airs_report_proofs (
  report_id uuid primary key references public.airs_reports(id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  size_bytes integer not null,
  sha256 text not null,
  uploaded_by_issuer text not null,
  uploaded_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint airs_report_proofs_path_chk check (
    storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'
  ),
  constraint airs_report_proofs_type_chk check (
    content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  constraint airs_report_proofs_size_chk check (size_bytes between 1 and 10485760),
  constraint airs_report_proofs_sha_chk check (sha256 ~ '^[0-9a-f]{64}$')
);

create unique index airs_report_proofs_path_uidx on public.airs_report_proofs (storage_path);

comment on table public.airs_report_proofs is
  'Private supporting file of a User Airs Report; read only through API signed URLs.';

alter table public.airs_report_proofs enable row level security;
revoke all on table public.airs_report_proofs from public, anon, authenticated;
grant select, insert on table public.airs_report_proofs to service_role;

-- ─── Invite ─────────────────────────────────────────────────────────────────

-- Invites a person without a verified account. An email with a verified account must be
-- added as a participant instead (CLIENT_HAS_ACCOUNT). A pending invitation for the same
-- email is returned as is (idempotent: true).
create or replace function public.marketplace_invite_project_client(
  p_project_id uuid,
  p_email text,
  p_name text,
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
  c_daily_limit constant integer := 50;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_project public.projects;
  v_invitation public.project_client_invitations;
  v_enterprise_id uuid;
  v_authorized boolean := false;
  v_reason text;
  v_today integer := 0;
begin
  select * into v_project from public.projects project where project.id = p_project_id;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = p_project_id
  order by relation.is_primary desc, relation.enterprise_id
  limit 1;

  if p_project_id is null
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or char_length(v_email) > 254
    or char_length(btrim(coalesce(p_name, ''))) not between 1 and 120
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or array_position(p_actor_roles, null) is not null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'CLIENT_INPUT_INVALID';
  elsif v_project.id is null then
    v_reason := 'PROJECT_NOT_FOUND';
  elsif v_project.status = 'archived' then
    v_reason := 'PROJECT_ARCHIVED';
  end if;

  if v_reason is null then
    if p_actor_roles && array['platform_owner', 'internal_admin'] then
      v_authorized := true;
    elsif p_actor_roles && array['partner_operator', 'sub_admin'] then
      select exists (
        select 1
        from public.enterprise_projects relation
        where relation.project_id = p_project_id
          and public.marketplace_actor_has_scope(
            p_actor_issuer, p_actor_subject, p_actor_roles,
            relation.enterprise_id, p_project_id, array['partner_operator', 'sub_admin']
          )
      ) into v_authorized;
      if not coalesce(v_authorized, false) then
        v_reason := 'PROJECT_SCOPE_DENIED';
      end if;
    else
      v_reason := 'PERMISSION_DENIED';
    end if;
  end if;

  if v_reason is null and exists (
    select 1 from public.users app_user
    where lower(btrim(app_user.email)) = v_email and app_user.email_verified = true
  ) then
    v_reason := 'CLIENT_HAS_ACCOUNT';
  end if;

  if v_reason is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(concat_ws(':', 'project-client-invite', p_project_id, v_email), 0)
    );

    select * into v_invitation
    from public.project_client_invitations invitation
    where invitation.project_id = p_project_id
      and invitation.email = v_email
      and invitation.status = 'pending';

    if found then
      return jsonb_build_object('ok', true, 'idempotent', true, 'invitation', to_jsonb(v_invitation));
    end if;

    -- Invitations send email: a project cannot invite more than the daily limit.
    select count(*) into v_today
    from public.project_client_invitations invitation
    where invitation.project_id = p_project_id
      and invitation.invited_at >= timezone('utc', now()) - interval '1 day';
    if v_today >= c_daily_limit then
      v_reason := 'CLIENT_INVITE_RATE_LIMITED';
    end if;
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type,
      enterprise_id, project_id, request_id, result, reason_code, metadata
    ) values (
      coalesce(nullif(btrim(p_actor_issuer), ''), 'unknown'),
      coalesce(nullif(btrim(p_actor_subject), ''), 'unknown'),
      coalesce(p_actor_roles, '{}'::text[]),
      'client.invite_denied', 'project_client', v_enterprise_id,
      case when v_project.id is not null then p_project_id else null end,
      coalesce(nullif(btrim(p_request_id), ''), 'unknown'), 'denied', v_reason,
      jsonb_build_object('requestedProjectId', p_project_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  insert into public.project_client_invitations (
    project_id, email, name, invited_by_issuer, invited_by_subject
  ) values (
    p_project_id, v_email, btrim(p_name), btrim(p_actor_issuer), btrim(p_actor_subject)
  ) returning * into v_invitation;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, after_state
  ) values (
    p_actor_issuer, p_actor_subject, p_actor_roles, 'client.invited', 'project_client',
    v_invitation.id, v_enterprise_id, p_project_id, p_request_id, 'allowed',
    to_jsonb(v_invitation)
  );

  return jsonb_build_object('ok', true, 'idempotent', false, 'invitation', to_jsonb(v_invitation));
end;
$$;

-- ─── Cancel ─────────────────────────────────────────────────────────────────

create or replace function public.marketplace_cancel_project_client_invitation(
  p_invitation_id uuid,
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
  v_invitation public.project_client_invitations;
  v_after public.project_client_invitations;
  v_authorized boolean := false;
begin
  select * into v_invitation
  from public.project_client_invitations invitation
  where invitation.id = p_invitation_id
  for update;

  if v_invitation.id is null then
    return jsonb_build_object('ok', false, 'reasonCode', 'CLIENT_NOT_FOUND');
  end if;
  if v_invitation.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reasonCode', 'CLIENT_INVITATION_NOT_PENDING');
  end if;

  if p_actor_roles && array['platform_owner', 'internal_admin'] then
    v_authorized := true;
  elsif p_actor_roles && array['partner_operator', 'sub_admin'] then
    select exists (
      select 1
      from public.enterprise_projects relation
      where relation.project_id = v_invitation.project_id
        and public.marketplace_actor_has_scope(
          p_actor_issuer, p_actor_subject, p_actor_roles,
          relation.enterprise_id, v_invitation.project_id, array['partner_operator', 'sub_admin']
        )
    ) into v_authorized;
  end if;
  if not coalesce(v_authorized, false) then
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_SCOPE_DENIED');
  end if;

  update public.project_client_invitations
  set status = 'cancelled',
      cancelled_by_issuer = btrim(p_actor_issuer),
      cancelled_by_subject = btrim(p_actor_subject),
      cancelled_at = timezone('utc', now())
  where id = v_invitation.id
  returning * into v_after;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    project_id, request_id, result, before_state, after_state
  ) values (
    p_actor_issuer, p_actor_subject, p_actor_roles, 'client.invitation_cancelled',
    'project_client', v_after.id, v_after.project_id, p_request_id, 'allowed',
    to_jsonb(v_invitation), to_jsonb(v_after)
  );

  return jsonb_build_object('ok', true, 'invitation', to_jsonb(v_after));
end;
$$;

-- ─── Accept on sign-up ──────────────────────────────────────────────────────

-- Called by the API on every sign-in with a confirmed email (like the Airs report claim):
-- each pending invitation for that email becomes an active participant. Idempotent.
create or replace function public.marketplace_accept_project_client_invitations(
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
  v_email text := lower(btrim(coalesce(p_session_email, '')));
  v_user public.users;
  v_invitation public.project_client_invitations;
  v_participant public.project_participants;
  v_accepted integer := 0;
begin
  if nullif(btrim(coalesce(p_user_id, '')), '') is null
    or v_email = ''
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'CLIENT_INPUT_INVALID');
  end if;

  if not exists (
    select 1 from public.project_client_invitations invitation
    where invitation.email = v_email and invitation.status = 'pending'
  ) then
    return jsonb_build_object('ok', true, 'accepted', 0);
  end if;

  select * into v_user from public.users app_user where app_user.id::text = btrim(p_user_id);
  if v_user.id is null
    or not coalesce(p_email_confirmed, false)
    or lower(btrim(coalesce(v_user.email, ''))) <> v_email
    or v_user.email_verified is distinct from true
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'CLIENT_ACCEPT_EMAIL_NOT_CONFIRMED');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('project-client-accept:' || v_email, 0)
  );

  for v_invitation in
    select * from public.project_client_invitations invitation
    where invitation.email = v_email and invitation.status = 'pending'
    order by invitation.invited_at, invitation.id
    for update
  loop
    if not exists (
      select 1 from public.project_participants participant
      where participant.project_id = v_invitation.project_id
        and participant.user_id = v_user.id::text
        and participant.status = 'active'
    ) then
      insert into public.project_participants (
        project_id, user_id, added_by_issuer, added_by_subject
      ) values (
        v_invitation.project_id, v_user.id::text,
        v_invitation.invited_by_issuer, v_invitation.invited_by_subject
      ) returning * into v_participant;
    end if;

    update public.project_client_invitations
    set status = 'accepted',
        accepted_user_id = v_user.id::text,
        accepted_at = timezone('utc', now())
    where id = v_invitation.id;

    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      project_id, request_id, result, metadata
    ) values (
      'system', 'project-client-accept', '{}'::text[], 'client.invitation_accepted',
      'project_client', v_invitation.id, v_invitation.project_id, btrim(p_request_id),
      'allowed', jsonb_build_object('userId', v_user.id::text)
    );
    v_accepted := v_accepted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'accepted', v_accepted);
end;
$$;

revoke all on function public.marketplace_invite_project_client(uuid, text, text, text, text, text[], text)
  from public, anon, authenticated;
revoke all on function public.marketplace_cancel_project_client_invitation(uuid, text, text, text[], text)
  from public, anon, authenticated;
revoke all on function public.marketplace_accept_project_client_invitations(text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.marketplace_invite_project_client(uuid, text, text, text, text, text[], text)
  to service_role;
grant execute on function public.marketplace_cancel_project_client_invitation(uuid, text, text, text[], text)
  to service_role;
grant execute on function public.marketplace_accept_project_client_invitations(text, text, boolean, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
