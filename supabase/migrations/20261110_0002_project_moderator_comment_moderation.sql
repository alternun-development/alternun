-- Project moderators can moderate the comments of their projects.
--
-- 20261109_0003 added the `project_moderator` membership role and the API grants it
-- comments:moderate, but marketplace_moderate_comment (20261013_0005) only accepted scoped
-- partner_operator/sub_admin and denied it. This redefines the function with the project
-- moderator in both the role check and the required scope roles; nothing else changes.

begin;

create or replace function public.marketplace_moderate_comment(
  p_comment_id uuid,
  p_target_status text,
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
  v_before public.project_comments;
  v_after public.project_comments;
  v_enterprise_id uuid;
  v_authorized boolean := false;
  v_reason text;
begin
  if nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'COMMENT_INPUT_INVALID';
  end if;

  if v_reason is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        concat_ws(':', 'marketplace-comment-moderation', p_actor_issuer,
          p_actor_subject, p_request_id),
        0
      )
    );

    select comment.* into v_after
    from public.admin_audit_log audit
    join public.project_comments comment on comment.id = audit.target_id
    where audit.action = 'comment.moderated'
      and audit.result = 'allowed'
      and audit.actor_issuer = p_actor_issuer
      and audit.actor_subject = p_actor_subject
      and audit.request_id = p_request_id
      and audit.target_id = p_comment_id
    order by audit.occurred_at desc
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'comment', to_jsonb(v_after)
      );
    end if;
  end if;

  select * into v_before
  from public.project_comments comment
  where comment.id = p_comment_id
  for update;

  if not found then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      request_id, result, reason_code
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'comment.moderation_denied', 'comment', p_comment_id, p_request_id,
      'denied', 'COMMENT_NOT_FOUND'
    );
    return jsonb_build_object('ok', false, 'reasonCode', 'COMMENT_NOT_FOUND');
  end if;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = v_before.project_id
  order by relation.is_primary desc, relation.enterprise_id
  limit 1;

  if v_reason is null then
    if coalesce(p_actor_roles, '{}'::text[])
      && array['platform_owner', 'internal_admin', 'moderator']
    then
      v_authorized := true;
    elsif coalesce(p_actor_roles, '{}'::text[])
      && array['partner_operator', 'sub_admin', 'project_moderator']
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
            array['partner_operator', 'sub_admin', 'project_moderator']
          )
      ) into v_authorized;

      if not coalesce(v_authorized, false) then
        v_reason := 'PROJECT_SCOPE_DENIED';
      end if;
    else
      v_reason := 'PERMISSION_DENIED';
    end if;
  end if;

  if v_reason is null and (
    p_target_status is null
    or p_target_status not in ('visible', 'rejected', 'hidden')
  ) then
    v_reason := 'COMMENT_TRANSITION_INVALID';
  elsif v_reason is null and not (
    (v_before.status = 'pending' and p_target_status in ('visible', 'rejected'))
    or (v_before.status = 'visible' and p_target_status = 'hidden')
    or (v_before.status = 'hidden' and p_target_status = 'visible')
  ) then
    v_reason := 'COMMENT_TRANSITION_INVALID';
  elsif v_reason is null
    and p_target_status in ('rejected', 'hidden')
    and nullif(btrim(coalesce(p_reason, '')), '') is null
  then
    v_reason := 'COMMENT_REASON_REQUIRED';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, project_id, request_id, result, reason_code,
      before_state, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'comment.moderation_denied', 'comment', v_before.id, v_enterprise_id,
      v_before.project_id, p_request_id, 'denied', v_reason,
      to_jsonb(v_before),
      jsonb_build_object('targetStatus', p_target_status, 'reason', p_reason)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.project_comments comment
  set status = p_target_status,
      moderated_by_issuer = btrim(p_actor_issuer),
      moderated_by_subject = btrim(p_actor_subject),
      moderated_at = timezone('utc', now()),
      moderation_reason = case
        when p_target_status in ('rejected', 'hidden') then btrim(p_reason)
        else null
      end
  where comment.id = p_comment_id
  returning * into v_after;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, before_state, after_state,
    metadata
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'comment.moderated', 'comment', v_after.id, v_enterprise_id,
    v_after.project_id, p_request_id, 'allowed', to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('targetStatus', p_target_status, 'reason', p_reason)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'comment', to_jsonb(v_after)
  );
end;
$$;

revoke all on function public.marketplace_moderate_comment(
  uuid, text, text, text, text[], text, text
) from public, anon, authenticated;
grant execute on function public.marketplace_moderate_comment(
  uuid, text, text, text, text[], text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
