-- Issue #249 project comments and server-only moderation.
-- Client roles have no table or function access; PostgREST calls use service_role.

begin;

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_issuer text not null,
  author_subject text not null,
  author_user_id text not null,
  author_display_name text not null,
  body text not null,
  status text not null default 'pending',
  moderated_by_issuer text,
  moderated_by_subject text,
  moderated_at timestamptz,
  moderation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_comments_author_identity_chk check (
    nullif(btrim(author_issuer), '') is not null
    and nullif(btrim(author_subject), '') is not null
    and nullif(btrim(author_user_id), '') is not null
  ),
  constraint project_comments_author_display_name_chk check (
    char_length(btrim(author_display_name)) between 1 and 100
  ),
  constraint project_comments_body_chk check (
    char_length(btrim(body)) between 1 and 1000
    and body !~ '[[:cntrl:]]'
  ),
  constraint project_comments_status_chk check (
    status in ('pending', 'visible', 'rejected', 'hidden')
  ),
  constraint project_comments_moderation_chk check (
    (
      status = 'pending'
      and moderated_by_issuer is null
      and moderated_by_subject is null
      and moderated_at is null
      and moderation_reason is null
    )
    or (
      status in ('visible', 'rejected', 'hidden')
      and nullif(btrim(moderated_by_issuer), '') is not null
      and nullif(btrim(moderated_by_subject), '') is not null
      and moderated_at is not null
      and (
        (status = 'visible' and moderation_reason is null)
        or (
          status in ('rejected', 'hidden')
          and nullif(btrim(moderation_reason), '') is not null
        )
      )
    )
  )
);

create index project_comments_project_status_created_idx
  on public.project_comments (project_id, status, created_at desc);

create index project_comments_author_rate_idx
  on public.project_comments (
    project_id,
    author_issuer,
    author_subject,
    created_at desc
  );

create trigger project_comments_set_updated_at
before update on public.project_comments
for each row execute function public.marketplace_set_updated_at();

create or replace function public.marketplace_create_comment(
  p_project_id uuid,
  p_author_issuer text,
  p_author_subject text,
  p_author_user_id text,
  p_author_display_name text,
  p_body text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_comment public.project_comments;
  v_recent_count integer;
  v_daily_count integer;
  v_reason text;
begin
  if p_project_id is null
    or nullif(btrim(coalesce(p_author_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_author_subject, '')), '') is null
    or nullif(btrim(coalesce(p_author_user_id, '')), '') is null
    or p_author_display_name is null
    or char_length(btrim(p_author_display_name)) not between 1 and 100
    or p_body is null
    or char_length(btrim(p_body)) not between 1 and 1000
    or p_body ~ '[[:cntrl:]]'
    or nullif(btrim(coalesce(p_request_id, '')), '') is null
  then
    v_reason := 'COMMENT_INPUT_INVALID';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, action, target_type, project_id,
      request_id, result, reason_code
    ) values (
      p_author_issuer, p_author_subject, 'comment.create_denied', 'comment',
      p_project_id, p_request_id, 'denied', v_reason
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      concat_ws(':', 'marketplace-comment-request', p_author_issuer,
        p_author_subject, p_request_id),
      0
    )
  );

  select comment.* into v_comment
  from public.admin_audit_log audit
  join public.project_comments comment on comment.id = audit.target_id
  where audit.action = 'comment.created'
    and audit.result = 'allowed'
    and audit.actor_issuer = p_author_issuer
    and audit.actor_subject = p_author_subject
    and audit.request_id = p_request_id
    and audit.project_id = p_project_id
  order by audit.occurred_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'comment', to_jsonb(v_comment)
    );
  end if;

  if not exists (
    select 1
    from public.projects project
    where project.id = p_project_id
      and project.status = 'published'
  ) then
    v_reason := 'PROJECT_NOT_FOUND';
  end if;

  if v_reason is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        concat_ws(':', 'marketplace-comment-rate', p_project_id::text,
          p_author_issuer, p_author_subject),
        0
      )
    );

    select
      count(*) filter (
        where comment.created_at >= timezone('utc', now()) - interval '10 minutes'
      ),
      count(*) filter (
        where comment.created_at >= timezone('utc', now()) - interval '1 day'
      )
    into v_recent_count, v_daily_count
    from public.project_comments comment
    where comment.project_id = p_project_id
      and comment.author_issuer = p_author_issuer
      and comment.author_subject = p_author_subject;

    if v_recent_count >= 3 or v_daily_count >= 20 then
      v_reason := 'COMMENT_RATE_LIMITED';
    end if;
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, action, target_type, project_id,
      request_id, result, reason_code,
      metadata
    ) values (
      p_author_issuer, p_author_subject, 'comment.create_denied', 'comment',
      p_project_id, p_request_id, 'denied', v_reason,
      jsonb_build_object(
        'recentCount', coalesce(v_recent_count, 0),
        'dailyCount', coalesce(v_daily_count, 0)
      )
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  insert into public.project_comments (
    project_id,
    author_issuer,
    author_subject,
    author_user_id,
    author_display_name,
    body
  ) values (
    p_project_id,
    btrim(p_author_issuer),
    btrim(p_author_subject),
    btrim(p_author_user_id),
    btrim(p_author_display_name),
    btrim(p_body)
  ) returning * into v_comment;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, action, target_type, target_id, project_id,
    request_id, result, after_state
  ) values (
    p_author_issuer, p_author_subject, 'comment.created', 'comment',
    v_comment.id, p_project_id, p_request_id, 'allowed', to_jsonb(v_comment)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'comment', to_jsonb(v_comment)
  );
end;
$$;

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

comment on function public.marketplace_create_comment(
  uuid, text, text, text, text, text, text
) is 'Creates a pending comment for a published project with server-enforced rate limits.';

comment on function public.marketplace_moderate_comment(
  uuid, text, text, text, text[], text, text
) is 'Atomically moderates a project comment after role and membership scope checks.';

alter table public.project_comments enable row level security;

revoke all on table public.project_comments from public, anon, authenticated;
grant select, insert, update, delete on table public.project_comments to service_role;

revoke all on function public.marketplace_create_comment(
  uuid, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.marketplace_moderate_comment(
  uuid, text, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_create_comment(
  uuid, text, text, text, text, text, text
) to service_role;
grant execute on function public.marketplace_moderate_comment(
  uuid, text, text, text, text[], text, text
) to service_role;

commit;
