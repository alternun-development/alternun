-- Verification for 20261020_0001_restrict_moderator_completion_approval.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back.

begin;

do $$
declare
  v_project_id constant uuid := '24900000-0000-4000-8000-000000000002';
  v_activity_id constant uuid := '24900000-0000-4000-8000-000000000004';
  v_enterprise_id uuid;
  v_user_id text;
  v_completion_id uuid;
  v_result jsonb;
begin
  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = v_project_id
    and relation.is_primary;
  if v_enterprise_id is null then
    raise exception 'fixture: seeded project has no primary enterprise';
  end if;

  update public.projects set status = 'published', published_at = coalesce(published_at, timezone('utc', now())),
    first_published_at = coalesce(first_published_at, timezone('utc', now()))
  where id = v_project_id;
  update public.project_activities set status = 'published' where id = v_activity_id;

  insert into public.users (sub, iss, email, email_verified)
  values ('verification-participant', 'verification', null, true)
  returning id::text into v_user_id;

  insert into public.project_activity_completions (
    project_id, activity_id, user_id, occurrence_key, period_key,
    created_by_issuer, created_by_subject
  ) values (
    v_project_id, v_activity_id, v_user_id, 'verification-occurrence', 'verification-period',
    'verification', 'creator'
  )
  returning id into v_completion_id;

  -- The global moderator alone can no longer approve, and the denial is audited.
  v_result := public.marketplace_approve_activity_completion(
    v_completion_id, 'verification', 'moderator-only', array['moderator'],
    'verification-moderator-approve', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'moderator approval assertion failed: %', v_result;
  end if;
  if not exists (
    select 1 from public.admin_audit_log audit
    where audit.request_id = 'verification-moderator-approve'
      and audit.action = 'airs_reward.issue_denied'
      and audit.result = 'denied'
  ) then
    raise exception 'moderator approval denial was not audited';
  end if;
  if (select status from public.project_activity_completions where id = v_completion_id)
    is distinct from 'pending'
  then
    raise exception 'moderator approval changed the completion';
  end if;

  -- Moderator held next to a scoped role does not widen that role.
  v_result := public.marketplace_approve_activity_completion(
    v_completion_id, 'verification', 'moderator-operator', array['moderator', 'partner_operator'],
    'verification-moderator-operator-approve', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'moderator plus unscoped operator approval assertion failed: %', v_result;
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'moderator-operator', array['moderator', 'partner_operator'],
    v_enterprise_id, v_project_id, array['partner_operator']
  ) is not false then
    raise exception 'moderator widened partner_operator scope';
  end if;

  -- Moderator stays global for its own permissions; global admins are unchanged.
  if public.marketplace_actor_has_scope(
    'verification', 'moderator-only', array['moderator'], v_enterprise_id, v_project_id,
    array['moderator']
  ) is not true then
    raise exception 'moderator own-permission scope assertion failed';
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'owner', array['platform_owner'], v_enterprise_id, v_project_id,
    array['partner_operator']
  ) is not true then
    raise exception 'platform_owner scope assertion failed';
  end if;
  if public.marketplace_actor_has_scope(
    'verification', 'moderator-only', array['moderator', null], v_enterprise_id, v_project_id,
    array['moderator']
  ) is not false then
    raise exception 'NULL role scope assertion failed';
  end if;

  -- A scoped operator with an active membership still approves, even with moderator.
  insert into public.project_memberships (
    member_issuer, member_subject, enterprise_id, scope_type, role,
    granted_by_issuer, granted_by_subject
  ) values (
    'verification', 'moderator-operator', v_enterprise_id, 'enterprise', 'partner_operator',
    'verification', 'owner'
  );
  v_result := public.marketplace_approve_activity_completion(
    v_completion_id, 'verification', 'moderator-operator', array['moderator', 'partner_operator'],
    'verification-scoped-operator-approve', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'scoped operator approval assertion failed: %', v_result;
  end if;

  -- Both redefined functions stay closed to client roles.
  if has_function_privilege(
    'anon', 'public.marketplace_approve_activity_completion(uuid,text,text,text[],text,text)', 'EXECUTE'
  ) or has_function_privilege(
    'authenticated', 'public.marketplace_actor_has_scope(text,text,text[],uuid,uuid,text[])', 'EXECUTE'
  ) or not has_function_privilege(
    'service_role', 'public.marketplace_approve_activity_completion(uuid,text,text,text[],text,text)', 'EXECUTE'
  ) then
    raise exception 'function grant assertion failed';
  end if;
end;
$$;

rollback;
