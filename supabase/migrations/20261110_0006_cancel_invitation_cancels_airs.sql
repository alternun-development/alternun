-- Cancelling a client invitation also cancels the Airs that were waiting for that person in the
-- project (awaiting_claim or pending_approval), so nothing from a cancelled invitation can be
-- claimed later. A person has at most one pending invitation per project; each invitation can
-- carry several assignments.
--
-- The existing report state machine already allows awaiting_claim -> cancelled and
-- pending_approval -> cancelled; each cancellation is audited like a manual one.

begin;

-- Internal helper: cancels the email's waiting Airs in the project submitted up to p_before.
create or replace function public.project_client_cancel_waiting_airs(
  p_project_id uuid,
  p_email text,
  p_before timestamptz,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.airs_reports;
  v_after public.airs_reports;
  v_count integer := 0;
begin
  for v_before in
    select * from public.airs_reports report
    where report.project_id = p_project_id
      and lower(report.recipient_email) = lower(btrim(p_email))
      and report.status in ('awaiting_claim', 'pending_approval')
      and report.submitted_at <= p_before
    order by report.submitted_at, report.id
    for update
  loop
    update public.airs_reports
    set status = 'cancelled',
        cancelled_by_issuer = btrim(p_actor_issuer),
        cancelled_by_subject = btrim(p_actor_subject),
        cancelled_at = timezone('utc', now()),
        cancellation_reason = btrim(p_reason)
    where id = v_before.id
    returning * into v_after;

    perform public.airs_report_audit(
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'airs_report.cancelled', v_after.id, v_after.project_id, p_request_id, 'allowed', null,
      public.airs_report_json(v_before), public.airs_report_json(v_after),
      jsonb_build_object('reason', btrim(p_reason), 'cause', 'client_invitation_cancelled')
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.project_client_cancel_waiting_airs(
  uuid, text, timestamptz, text, text, text[], text, text
) from public, anon, authenticated;

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
  v_cancelled_airs integer := 0;
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

  v_cancelled_airs := public.project_client_cancel_waiting_airs(
    v_after.project_id, v_after.email, v_after.cancelled_at,
    p_actor_issuer, p_actor_subject, p_actor_roles, p_request_id, 'Invitación cancelada'
  );

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    project_id, request_id, result, before_state, after_state, metadata
  ) values (
    p_actor_issuer, p_actor_subject, p_actor_roles, 'client.invitation_cancelled',
    'project_client', v_after.id, v_after.project_id, p_request_id, 'allowed',
    to_jsonb(v_invitation), to_jsonb(v_after),
    jsonb_build_object('cancelledAirs', v_cancelled_airs)
  );

  return jsonb_build_object(
    'ok', true, 'invitation', to_jsonb(v_after), 'cancelledAirs', v_cancelled_airs
  );
end;
$$;

revoke all on function public.marketplace_cancel_project_client_invitation(uuid, text, text, text[], text)
  from public, anon, authenticated;
grant execute on function public.marketplace_cancel_project_client_invitation(uuid, text, text, text[], text)
  to service_role;

-- Backfill: invitations cancelled before this rule left their Airs waiting. Cancel the ones
-- assigned up to each cancellation (Airs of a later, still pending invitation are kept).
do $$
declare
  v_invitation public.project_client_invitations;
begin
  for v_invitation in
    select * from public.project_client_invitations invitation
    where invitation.status = 'cancelled'
    order by invitation.cancelled_at
  loop
    perform public.project_client_cancel_waiting_airs(
      v_invitation.project_id, v_invitation.email, v_invitation.cancelled_at,
      coalesce(v_invitation.cancelled_by_issuer, 'system'),
      coalesce(v_invitation.cancelled_by_subject, 'client-invitation-backfill'),
      '{}'::text[], 'client-invitation-backfill:' || v_invitation.id::text,
      'Invitación cancelada'
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
