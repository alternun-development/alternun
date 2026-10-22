-- Issue #249 project participants and server-only participant administration.

begin;

create table public.project_participants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id text not null,
  status text not null default 'active',
  added_by_issuer text not null,
  added_by_subject text not null,
  added_at timestamptz not null default timezone('utc', now()),
  removed_by_issuer text,
  removed_by_subject text,
  removed_at timestamptz,
  removal_reason text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_participants_user_id_chk check (
    nullif(btrim(user_id), '') is not null
  ),
  constraint project_participants_added_identity_chk check (
    nullif(btrim(added_by_issuer), '') is not null
    and nullif(btrim(added_by_subject), '') is not null
  ),
  constraint project_participants_status_chk check (
    status in ('active', 'removed')
  ),
  constraint project_participants_removal_chk check (
    (
      status = 'active'
      and removed_by_issuer is null
      and removed_by_subject is null
      and removed_at is null
      and removal_reason is null
    )
    or (
      status = 'removed'
      and nullif(btrim(removed_by_issuer), '') is not null
      and nullif(btrim(removed_by_subject), '') is not null
      and removed_at is not null
      and nullif(btrim(removal_reason), '') is not null
    )
  )
);

comment on column public.project_participants.user_id is
  'Application user ID stored as text to match project activity completions.';

create unique index project_participants_active_project_user_uidx
  on public.project_participants (project_id, user_id)
  where status = 'active';

create index project_participants_project_idx
  on public.project_participants (project_id, status, added_at desc);

create index project_participants_user_idx
  on public.project_participants (user_id, status, added_at desc);

create trigger project_participants_set_updated_at
before update on public.project_participants
for each row execute function public.marketplace_set_updated_at();

create or replace function public.marketplace_add_project_participant(
  p_project_id uuid,
  p_user_email text,
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
  v_project public.projects;
  v_user public.users;
  v_participant public.project_participants;
  v_enterprise_id uuid;
  v_authorized boolean := false;
  v_reason text;
begin
  select * into v_project
  from public.projects project
  where project.id = p_project_id;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = p_project_id
  order by relation.is_primary desc, relation.enterprise_id
  limit 1;

  if p_project_id is null
    or nullif(btrim(coalesce(p_user_email, '')), '') is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or array_position(p_actor_roles, null) is not null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'PARTICIPANT_INPUT_INVALID';
  end if;

  if v_reason is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        concat_ws(':', 'marketplace-participant-add', p_actor_issuer,
          p_actor_subject, p_request_id),
        0
      )
    );

    select participant.* into v_participant
    from public.admin_audit_log audit
    join public.project_participants participant on participant.id = audit.target_id
    where audit.action = 'participant.added'
      and audit.result = 'allowed'
      and audit.actor_issuer = p_actor_issuer
      and audit.actor_subject = p_actor_subject
      and audit.request_id = p_request_id
      and audit.project_id = p_project_id
    order by audit.occurred_at desc
    limit 1;

    if found then
      select * into v_user
      from public.users app_user
      where app_user.id::text = v_participant.user_id
      limit 1;

      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'participant', jsonb_build_object(
          'id', v_participant.id,
          'userId', v_participant.user_id,
          'displayName', coalesce(nullif(btrim(v_user.name), ''), v_user.email),
          'email', v_user.email,
          'status', v_participant.status,
          'addedAt', v_participant.added_at
        )
      );
    end if;
  end if;

  if v_reason is null and v_project.id is null then
    v_reason := 'PROJECT_NOT_FOUND';
  elsif v_reason is null and v_project.status = 'archived' then
    v_reason := 'PROJECT_ARCHIVED';
  end if;

  if v_reason is null then
    if coalesce(p_actor_roles, '{}'::text[])
      && array['platform_owner', 'internal_admin']
    then
      v_authorized := true;
    elsif coalesce(p_actor_roles, '{}'::text[])
      && array['partner_operator', 'sub_admin']
    then
      select exists (
        select 1
        from public.enterprise_projects relation
        where relation.project_id = p_project_id
          and public.marketplace_actor_has_scope(
            p_actor_issuer,
            p_actor_subject,
            p_actor_roles,
            relation.enterprise_id,
            p_project_id,
            array['partner_operator', 'sub_admin']
          )
      ) into v_authorized;

      if not coalesce(v_authorized, false) then
        v_reason := 'PROJECT_SCOPE_DENIED';
      end if;
    else
      v_reason := 'PERMISSION_DENIED';
    end if;
  end if;

  if v_reason is null then
    select * into v_user
    from public.users app_user
    where lower(btrim(app_user.email)) = lower(btrim(p_user_email))
      and app_user.email_verified = true
    order by app_user.created_at, app_user.id
    limit 1;

    if not found then
      v_reason := 'USER_NOT_FOUND';
    end if;
  end if;

  if v_reason is null and exists (
    select 1
    from public.project_participants participant
    where participant.project_id = p_project_id
      and participant.user_id = v_user.id::text
      and participant.status = 'active'
  ) then
    v_reason := 'PARTICIPANT_CONFLICT';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type,
      enterprise_id, project_id, request_id, result, reason_code, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'participant.add_denied', 'participant', v_enterprise_id,
      case when v_project.id is not null then p_project_id else null end,
      p_request_id, 'denied', v_reason,
      jsonb_build_object('requestedProjectId', p_project_id)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  insert into public.project_participants (
    project_id, user_id, added_by_issuer, added_by_subject
  ) values (
    p_project_id, v_user.id::text, btrim(p_actor_issuer), btrim(p_actor_subject)
  ) returning * into v_participant;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, after_state
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'participant.added', 'participant', v_participant.id, v_enterprise_id,
    p_project_id, p_request_id, 'allowed', to_jsonb(v_participant)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'participant', jsonb_build_object(
      'id', v_participant.id,
      'userId', v_participant.user_id,
      'displayName', coalesce(nullif(btrim(v_user.name), ''), v_user.email),
      'email', v_user.email,
      'status', v_participant.status,
      'addedAt', v_participant.added_at
    )
  );
end;
$$;

create or replace function public.marketplace_remove_project_participant(
  p_participant_id uuid,
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
  v_before public.project_participants;
  v_after public.project_participants;
  v_project public.projects;
  v_enterprise_id uuid;
  v_authorized boolean := false;
  v_reason text;
begin
  if p_participant_id is null
    or nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_actor_roles is null
    or array_position(p_actor_roles, null) is not null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'PARTICIPANT_INPUT_INVALID';
  end if;

  if v_reason is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        concat_ws(':', 'marketplace-participant-remove', p_actor_issuer,
          p_actor_subject, p_request_id),
        0
      )
    );

    select participant.* into v_after
    from public.admin_audit_log audit
    join public.project_participants participant on participant.id = audit.target_id
    where audit.action = 'participant.removed'
      and audit.result = 'allowed'
      and audit.actor_issuer = p_actor_issuer
      and audit.actor_subject = p_actor_subject
      and audit.request_id = p_request_id
      and audit.target_id = p_participant_id
    order by audit.occurred_at desc
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'participant', jsonb_build_object(
          'id', v_after.id,
          'userId', v_after.user_id,
          'status', v_after.status,
          'addedAt', v_after.added_at,
          'removedAt', v_after.removed_at
        )
      );
    end if;
  end if;

  select * into v_before
  from public.project_participants participant
  where participant.id = p_participant_id
  for update;

  if not found then
    v_reason := coalesce(v_reason, 'PARTICIPANT_NOT_FOUND');
  else
    select * into v_project
    from public.projects project
    where project.id = v_before.project_id;

    select relation.enterprise_id into v_enterprise_id
    from public.enterprise_projects relation
    where relation.project_id = v_before.project_id
    order by relation.is_primary desc, relation.enterprise_id
    limit 1;
  end if;

  if v_reason is null and v_project.status = 'archived' then
    v_reason := 'PROJECT_ARCHIVED';
  end if;

  if v_reason is null then
    if coalesce(p_actor_roles, '{}'::text[])
      && array['platform_owner', 'internal_admin']
    then
      v_authorized := true;
    elsif coalesce(p_actor_roles, '{}'::text[])
      && array['partner_operator', 'sub_admin']
    then
      select exists (
        select 1
        from public.enterprise_projects relation
        where relation.project_id = v_before.project_id
          and public.marketplace_actor_has_scope(
            p_actor_issuer,
            p_actor_subject,
            p_actor_roles,
            relation.enterprise_id,
            v_before.project_id,
            array['partner_operator', 'sub_admin']
          )
      ) into v_authorized;

      if not coalesce(v_authorized, false) then
        v_reason := 'PROJECT_SCOPE_DENIED';
      end if;
    else
      v_reason := 'PERMISSION_DENIED';
    end if;
  end if;

  if v_reason is null and nullif(btrim(coalesce(p_reason, '')), '') is null then
    v_reason := 'PARTICIPANT_REASON_REQUIRED';
  elsif v_reason is null and v_before.status <> 'active' then
    v_reason := 'PARTICIPANT_NOT_ACTIVE';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, project_id, request_id, result, reason_code,
      before_state, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'participant.remove_denied', 'participant', p_participant_id,
      v_enterprise_id,
      case when v_before.id is not null then v_before.project_id else null end,
      p_request_id, 'denied', v_reason,
      case when v_before.id is not null then to_jsonb(v_before) else null end,
      jsonb_build_object('reason', p_reason)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.project_participants participant
  set status = 'removed',
      removed_by_issuer = btrim(p_actor_issuer),
      removed_by_subject = btrim(p_actor_subject),
      removed_at = timezone('utc', now()),
      removal_reason = btrim(p_reason)
  where participant.id = v_before.id
  returning * into v_after;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, before_state, after_state,
    metadata
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'participant.removed', 'participant', v_after.id, v_enterprise_id,
    v_after.project_id, p_request_id, 'allowed', to_jsonb(v_before),
    to_jsonb(v_after), jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'participant', jsonb_build_object(
      'id', v_after.id,
      'userId', v_after.user_id,
      'status', v_after.status,
      'addedAt', v_after.added_at,
      'removedAt', v_after.removed_at
    )
  );
end;
$$;

comment on function public.marketplace_add_project_participant(
  uuid, text, text, text, text[], text
) is 'Adds a verified application user to a project after role and membership scope checks.';

comment on function public.marketplace_remove_project_participant(
  uuid, text, text, text[], text, text
) is 'Removes an active project participant after role and membership scope checks.';

alter table public.project_participants enable row level security;

revoke all on table public.project_participants from public, anon, authenticated;
grant select, insert, update, delete on table public.project_participants to service_role;

revoke all on function public.marketplace_add_project_participant(
  uuid, text, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_remove_project_participant(
  uuid, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_add_project_participant(
  uuid, text, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_remove_project_participant(
  uuid, text, text, text[], text, text
) to service_role;

commit;
