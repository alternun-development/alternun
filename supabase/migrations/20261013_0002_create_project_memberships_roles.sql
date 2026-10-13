-- Issue #249 scoped marketplace memberships and atomic role administration.
--
-- Deliberately does not create a foreign key to public.users. That table is
-- known to differ between environments (uuid vs text). Canonical identity is
-- issuer + subject; member_user_id is a compatibility reference stored as text
-- until Edward verifies both environments and a later migration can add a safe
-- relationship.

begin;

create table public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  member_issuer text not null,
  member_subject text not null,
  member_user_id text,
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  project_id uuid,
  scope_type text not null,
  role text not null,
  status text not null default 'active',
  granted_by_issuer text not null,
  granted_by_subject text not null,
  revoked_by_issuer text,
  revoked_by_subject text,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_memberships_identity_chk check (
    char_length(btrim(member_issuer)) > 0
    and char_length(btrim(member_subject)) > 0
  ),
  constraint project_memberships_scope_chk check (
    (scope_type = 'enterprise' and project_id is null)
    or (scope_type = 'project' and project_id is not null)
  ),
  constraint project_memberships_role_chk check (
    role in ('partner_operator', 'sub_admin', 'partner_readonly')
  ),
  constraint project_memberships_status_chk check (status in ('active', 'revoked')),
  constraint project_memberships_revocation_chk check (
    (status = 'active' and revoked_at is null and revoked_by_issuer is null and revoked_by_subject is null)
    or (status = 'revoked' and revoked_at is not null and revoked_by_issuer is not null and revoked_by_subject is not null)
  ),
  constraint project_memberships_project_enterprise_fk
    foreign key (enterprise_id, project_id)
    references public.enterprise_projects(enterprise_id, project_id)
    on delete cascade
);

comment on column public.project_memberships.member_user_id is
  'Compatibility ID stored as text without FK until public.users.id is verified in testnet and production.';

create unique index project_memberships_active_identity_scope_role_uidx
  on public.project_memberships (
    member_issuer,
    member_subject,
    enterprise_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    role
  )
  where status = 'active';

create index project_memberships_actor_lookup_idx
  on public.project_memberships (
    member_issuer,
    member_subject,
    status,
    enterprise_id,
    project_id
  );

create index project_memberships_project_idx
  on public.project_memberships (project_id, status, role)
  where project_id is not null;

create trigger project_memberships_set_updated_at
before update on public.project_memberships
for each row execute function public.marketplace_set_updated_at();

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
  v_reason text;
begin
  if p_scope_type not in ('enterprise', 'project')
    or (p_scope_type = 'enterprise' and p_project_id is not null)
    or (p_scope_type = 'project' and p_project_id is null)
    or p_role not in ('partner_operator', 'sub_admin', 'partner_readonly')
  then
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
    elsif 'partner_operator' = any(coalesce(p_actor_roles, '{}'::text[]))
      and v_is_scoped_operator
      and p_role in ('sub_admin', 'partner_readonly')
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
      p_enterprise_id,
      p_project_id,
      p_request_id,
      'denied',
      v_reason,
      jsonb_build_object(
        'requestedRole', p_role,
        'scopeType', p_scope_type,
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

  if p_new_role not in ('partner_operator', 'sub_admin', 'partner_readonly')
    or p_new_status not in ('active', 'revoked')
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
    elsif 'partner_operator' = any(coalesce(p_actor_roles, '{}'::text[]))
      and v_is_scoped_operator
      and v_before.role in ('sub_admin', 'partner_readonly')
      and p_new_role in ('sub_admin', 'partner_readonly')
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

alter table public.project_memberships enable row level security;

revoke all on table public.project_memberships from public, anon, authenticated;
grant select, insert, update, delete on table public.project_memberships to service_role;

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
