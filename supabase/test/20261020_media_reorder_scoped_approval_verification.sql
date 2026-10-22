-- Verification for 20261020_0002_restrict_media_reorder_and_scoped_approval.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back.

begin;

do $$
declare
  v_project_id constant uuid := '24900000-0000-4000-8000-000000000002';
  v_activity_id constant uuid := '24900000-0000-4000-8000-000000000004';
  v_enterprise_id uuid;
  v_gallery_a uuid;
  v_gallery_b uuid;
  v_items jsonb;
  v_user_a text;
  v_user_b text;
  v_completion_a uuid;
  v_completion_b uuid;
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

  insert into public.project_media_allowed_hosts (media_kind, host)
  values ('gallery_image', 'images.example.test')
  on conflict do nothing;
  insert into public.project_media (
    project_id, kind, url, alt_text, sort_order,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_project_id, 'gallery_image', 'https://images.example.test/a.png',
    jsonb_build_object((select default_locale from public.projects where id = v_project_id), 'A'),
    0, 'verification', 'seed', 'verification', 'seed'
  ) returning id into v_gallery_a;
  insert into public.project_media (
    project_id, kind, url, alt_text, sort_order,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    v_project_id, 'gallery_image', 'https://images.example.test/b.png',
    jsonb_build_object((select default_locale from public.projects where id = v_project_id), 'B'),
    1, 'verification', 'seed', 'verification', 'seed'
  ) returning id into v_gallery_b;
  v_items := jsonb_build_array(
    jsonb_build_object('id', v_gallery_b::text, 'sortOrder', 0),
    jsonb_build_object('id', v_gallery_a::text, 'sortOrder', 1)
  );

  insert into public.project_memberships (
    member_issuer, member_subject, enterprise_id, project_id, scope_type, role,
    granted_by_issuer, granted_by_subject
  ) values
    ('verification', 'scoped-sub-admin', v_enterprise_id, v_project_id, 'project', 'sub_admin',
      'verification', 'owner'),
    ('verification', 'scoped-operator', v_enterprise_id, null, 'enterprise', 'partner_operator',
      'verification', 'owner');

  -- (a) Media reorder: moderator is no longer global.
  v_result := public.marketplace_reorder_project_media(
    v_project_id, v_items, 'verification', 'moderator-only', array['moderator'],
    'verification-moderator-reorder'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'moderator reorder assertion failed: %', v_result;
  end if;
  if (select sort_order from public.project_media where id = v_gallery_a) <> 0 then
    raise exception 'moderator reorder changed the gallery';
  end if;

  v_result := public.marketplace_reorder_project_media(
    v_project_id, v_items, 'verification', 'moderator-unscoped', array['moderator', 'sub_admin'],
    'verification-moderator-sub-admin-reorder'
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'moderator plus unscoped sub_admin reorder assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_reorder_project_media(
    v_project_id, v_items, 'verification', 'scoped-sub-admin', array['sub_admin'],
    'verification-sub-admin-reorder'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'scoped sub_admin reorder assertion failed: %', v_result;
  end if;
  if (select sort_order from public.project_media where id = v_gallery_b) <> 0 then
    raise exception 'scoped sub_admin reorder did not apply';
  end if;

  v_result := public.marketplace_reorder_project_media(
    v_project_id, v_items, 'verification', 'scoped-operator', array['partner_operator'],
    'verification-operator-reorder'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'scoped partner_operator reorder assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_reorder_project_media(
    v_project_id, v_items, 'verification', 'owner', array['platform_owner'],
    'verification-owner-reorder'
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'platform_owner reorder assertion failed: %', v_result;
  end if;

  -- (b) Approval: a scoped sub_admin no longer awards points.
  insert into public.users (sub, iss, email, email_verified)
  values ('verification-participant-a', 'verification', null, true)
  returning id::text into v_user_a;
  insert into public.users (sub, iss, email, email_verified)
  values ('verification-participant-b', 'verification', null, true)
  returning id::text into v_user_b;
  insert into public.project_activity_completions (
    project_id, activity_id, user_id, occurrence_key, period_key,
    created_by_issuer, created_by_subject
  ) values (
    v_project_id, v_activity_id, v_user_a, 'verification-occurrence-a', 'verification-period',
    'verification', 'creator'
  ) returning id into v_completion_a;
  insert into public.project_activity_completions (
    project_id, activity_id, user_id, occurrence_key, period_key,
    created_by_issuer, created_by_subject
  ) values (
    v_project_id, v_activity_id, v_user_b, 'verification-occurrence-b', 'verification-period',
    'verification', 'creator'
  ) returning id into v_completion_b;

  v_result := public.marketplace_approve_activity_completion(
    v_completion_a, 'verification', 'scoped-sub-admin', array['sub_admin'],
    'verification-sub-admin-approve', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'scoped sub_admin approval assertion failed: %', v_result;
  end if;
  if not exists (
    select 1 from public.admin_audit_log audit
    where audit.request_id = 'verification-sub-admin-approve'
      and audit.action = 'airs_reward.issue_denied'
      and audit.result = 'denied'
  ) then
    raise exception 'scoped sub_admin approval denial was not audited';
  end if;

  -- A partner_operator claim does not help when the only membership is sub_admin.
  v_result := public.marketplace_approve_activity_completion(
    v_completion_a, 'verification', 'scoped-sub-admin', array['sub_admin', 'partner_operator'],
    'verification-sub-admin-claims-operator-approve', null
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_SCOPE_DENIED' then
    raise exception 'sub_admin membership with operator claim assertion failed: %', v_result;
  end if;
  if (select status from public.project_activity_completions where id = v_completion_a)
    is distinct from 'pending'
  then
    raise exception 'denied approvals changed the completion';
  end if;

  v_result := public.marketplace_approve_activity_completion(
    v_completion_a, 'verification', 'scoped-operator', array['partner_operator'],
    'verification-operator-approve', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'scoped partner_operator approval assertion failed: %', v_result;
  end if;

  v_result := public.marketplace_approve_activity_completion(
    v_completion_b, 'verification', 'owner', array['platform_owner'],
    'verification-owner-approve', null
  );
  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'platform_owner approval assertion failed: %', v_result;
  end if;

  -- Both redefined functions stay closed to client roles.
  if has_function_privilege(
    'anon', 'public.marketplace_reorder_project_media(uuid,jsonb,text,text,text[],text)', 'EXECUTE'
  ) or has_function_privilege(
    'authenticated', 'public.marketplace_approve_activity_completion(uuid,text,text,text[],text,text)', 'EXECUTE'
  ) or not has_function_privilege(
    'service_role', 'public.marketplace_reorder_project_media(uuid,jsonb,text,text,text[],text)', 'EXECUTE'
  ) then
    raise exception 'function grant assertion failed';
  end if;
end;
$$;

rollback;
