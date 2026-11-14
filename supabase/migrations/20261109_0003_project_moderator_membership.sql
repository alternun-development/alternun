-- Per-project moderators.
--
-- `moderator` is an Alternun-wide role (the admin guard treats it as global). Project and
-- enterprise admins (partner_operator) need to name moderators for their own projects only,
-- so memberships get a separate `project_moderator` role: it moderates comments and media of
-- the projects its membership covers and nothing else. Partner operators may grant, change
-- and revoke it, like sub_admin and partner_readonly; it cannot grant anything itself.
-- The two RPCs below are the 20261013_0002 versions with only the role lists extended.

begin;

alter table public.project_memberships
  drop constraint if exists project_memberships_role_chk;

alter table public.project_memberships
  add constraint project_memberships_role_chk check (
    role in ('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator')
  );

create or replace function public.marketplace_grant_project_membership(
  p_member_issuer text,
  p_member_subject text,
  p_member_user_id text,
  p_enterprise_id uuid,
  p_project_id uuid,
  p_scope_type text,
  p_role text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_is_global boolean;
  v_is_scoped_operator boolean;
  v_membership public.project_memberships;
  v_audit_enterprise_id uuid;
  v_audit_project_id uuid;
  v_reason text;
begin
  select enterprise.id into v_audit_enterprise_id
  from public.enterprises enterprise
  where enterprise.id = p_enterprise_id;

  if p_project_id is not null then
    select project.id into v_audit_project_id
    from public.projects project
    where project.id = p_project_id;
  end if;

  if p_scope_type is null
    or p_scope_type not in ('enterprise', 'project')
    or (p_scope_type = 'enterprise' and p_project_id is not null)
    or (p_scope_type = 'project' and p_project_id is null)
    or p_role is null
    or p_role not in ('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator')
    or nullif(btrim(coalesce(p_member_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_member_subject, '')), '') is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
  then
    v_reason := 'MEMBERSHIP_INPUT_INVALID';
  elsif v_audit_enterprise_id is null then
    v_reason := 'ENTERPRISE_NOT_FOUND';
  elsif p_project_id is not null and v_audit_project_id is null then
    v_reason := 'PROJECT_NOT_FOUND';
  elsif p_project_id is not null and not exists (
    select 1
    from public.enterprise_projects relation
    where relation.enterprise_id = p_enterprise_id
      and relation.project_id = p_project_id
  ) then
    v_reason := 'MEMBERSHIP_INPUT_INVALID';
  elsif p_member_issuer = p_actor_issuer and p_member_subject = p_actor_subject then
    v_reason := 'SELF_MEMBERSHIP_CHANGE_DENIED';
  else
    v_is_global := coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin'];

    select exists (
      select 1
      from public.project_memberships actor_membership
      where actor_membership.member_issuer = p_actor_issuer
        and actor_membership.member_subject = p_actor_subject
        and actor_membership.status = 'active'
        and actor_membership.role = 'partner_operator'
        and actor_membership.enterprise_id = p_enterprise_id
        and (
          actor_membership.scope_type = 'enterprise'
          or (
            actor_membership.scope_type = 'project'
            and actor_membership.project_id = p_project_id
          )
        )
    ) into v_is_scoped_operator;

    if v_is_global then
      v_reason := null;
    elsif coalesce('partner_operator' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and v_is_scoped_operator
      and p_role in ('sub_admin', 'partner_readonly', 'project_moderator')
    then
      v_reason := null;
    else
      v_reason := 'ROLE_ESCALATION_DENIED';
    end if;
  end if;

  if v_reason is null and exists (
    select 1
    from public.project_memberships existing_membership
    where existing_membership.member_issuer = p_member_issuer
      and existing_membership.member_subject = p_member_subject
      and existing_membership.enterprise_id = p_enterprise_id
      and existing_membership.project_id is not distinct from p_project_id
      and existing_membership.role = p_role
      and existing_membership.status = 'active'
  ) then
    v_reason := 'MEMBERSHIP_CONFLICT';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer,
      actor_subject,
      actor_roles,
      action,
      target_type,
      enterprise_id,
      project_id,
      request_id,
      result,
      reason_code,
      metadata
    ) values (
      p_actor_issuer,
      p_actor_subject,
      coalesce(p_actor_roles, '{}'::text[]),
      'project_membership.grant_denied',
      'project_membership',
      v_audit_enterprise_id,
      v_audit_project_id,
      p_request_id,
      'denied',
      v_reason,
      jsonb_build_object(
        'requestedRole', p_role,
        'scopeType', p_scope_type,
        'requestedEnterpriseId', p_enterprise_id,
        'requestedProjectId', p_project_id,
        'reason', p_reason
      )
    );

    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  insert into public.project_memberships (
    member_issuer,
    member_subject,
    member_user_id,
    enterprise_id,
    project_id,
    scope_type,
    role,
    status,
    granted_by_issuer,
    granted_by_subject
  ) values (
    p_member_issuer,
    p_member_subject,
    nullif(btrim(coalesce(p_member_user_id, '')), ''),
    p_enterprise_id,
    p_project_id,
    p_scope_type,
    p_role,
    'active',
    p_actor_issuer,
    p_actor_subject
  )
  returning * into v_membership;

  insert into public.admin_audit_log (
    actor_issuer,
    actor_subject,
    actor_roles,
    action,
    target_type,
    target_id,
    enterprise_id,
    project_id,
    request_id,
    result,
    after_state,
    metadata
  ) values (
    p_actor_issuer,
    p_actor_subject,
    coalesce(p_actor_roles, '{}'::text[]),
    'project_membership.granted',
    'project_membership',
    v_membership.id,
    v_membership.enterprise_id,
    v_membership.project_id,
    p_request_id,
    'allowed',
    to_jsonb(v_membership),
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'membership', to_jsonb(v_membership));
end;
$$;

create or replace function public.marketplace_change_project_membership(
  p_membership_id uuid,
  p_new_role text,
  p_new_status text,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before public.project_memberships;
  v_after public.project_memberships;
  v_is_global boolean;
  v_is_scoped_operator boolean;
  v_reason text;
begin
  select * into v_before
  from public.project_memberships membership
  where membership.id = p_membership_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reasonCode', 'MEMBERSHIP_NOT_FOUND');
  end if;

  if p_new_role is null
    or p_new_role not in ('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator')
    or p_new_status is null
    or p_new_status not in ('active', 'revoked')
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
  then
    v_reason := 'MEMBERSHIP_INPUT_INVALID';
  elsif v_before.member_issuer = p_actor_issuer and v_before.member_subject = p_actor_subject then
    v_reason := 'SELF_MEMBERSHIP_CHANGE_DENIED';
  elsif p_new_status = 'revoked' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    v_reason := 'REVOCATION_REASON_REQUIRED';
  else
    v_is_global := coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin'];

    select exists (
      select 1
      from public.project_memberships actor_membership
      where actor_membership.member_issuer = p_actor_issuer
        and actor_membership.member_subject = p_actor_subject
        and actor_membership.status = 'active'
        and actor_membership.role = 'partner_operator'
        and actor_membership.enterprise_id = v_before.enterprise_id
        and (
          actor_membership.scope_type = 'enterprise'
          or (
            actor_membership.scope_type = 'project'
            and actor_membership.project_id = v_before.project_id
          )
        )
    ) into v_is_scoped_operator;

    if v_is_global then
      v_reason := null;
    elsif coalesce('partner_operator' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and v_is_scoped_operator
      and v_before.role in ('sub_admin', 'partner_readonly', 'project_moderator')
      and p_new_role in ('sub_admin', 'partner_readonly', 'project_moderator')
    then
      v_reason := null;
    else
      v_reason := 'ROLE_ESCALATION_DENIED';
    end if;
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer,
      actor_subject,
      actor_roles,
      action,
      target_type,
      target_id,
      enterprise_id,
      project_id,
      request_id,
      result,
      reason_code,
      before_state,
      metadata
    ) values (
      p_actor_issuer,
      p_actor_subject,
      coalesce(p_actor_roles, '{}'::text[]),
      'project_membership.change_denied',
      'project_membership',
      v_before.id,
      v_before.enterprise_id,
      v_before.project_id,
      p_request_id,
      'denied',
      v_reason,
      to_jsonb(v_before),
      jsonb_build_object(
        'requestedRole', p_new_role,
        'requestedStatus', p_new_status,
        'reason', p_reason
      )
    );

    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.project_memberships membership
  set role = p_new_role,
      status = p_new_status,
      revoked_by_issuer = case when p_new_status = 'revoked' then p_actor_issuer else null end,
      revoked_by_subject = case when p_new_status = 'revoked' then p_actor_subject else null end,
      revoked_at = case when p_new_status = 'revoked' then timezone('utc', now()) else null end
  where membership.id = p_membership_id
  returning * into v_after;

  insert into public.admin_audit_log (
    actor_issuer,
    actor_subject,
    actor_roles,
    action,
    target_type,
    target_id,
    enterprise_id,
    project_id,
    request_id,
    result,
    before_state,
    after_state,
    metadata
  ) values (
    p_actor_issuer,
    p_actor_subject,
    coalesce(p_actor_roles, '{}'::text[]),
    case
      when v_before.status <> v_after.status and v_after.status = 'revoked'
        then 'project_membership.revoked'
      when v_before.role <> v_after.role
        then 'project_membership.role_changed'
      else 'project_membership.updated'
    end,
    'project_membership',
    v_after.id,
    v_after.enterprise_id,
    v_after.project_id,
    p_request_id,
    'allowed',
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'membership', to_jsonb(v_after));
end;
$$;

revoke all on function public.marketplace_grant_project_membership(
  text, text, text, uuid, uuid, text, text, text, text, text[], text, text
) from public, anon, authenticated;
revoke all on function public.marketplace_change_project_membership(
  uuid, text, text, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_grant_project_membership(
  text, text, text, uuid, uuid, text, text, text, text, text[], text, text
) to service_role;
grant execute on function public.marketplace_change_project_membership(
  uuid, text, text, text, text, text[], text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
