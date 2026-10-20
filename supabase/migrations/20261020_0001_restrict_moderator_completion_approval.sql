-- Issue #249 follow-up: the global moderator may not approve activity
-- completions (and so may not write the AIRS ledger), and holding moderator next
-- to a scoped role must not widen that scoped role.
--
-- Redefines two functions with CREATE OR REPLACE and the same signatures, so this
-- migration is safe to run more than once. Every other line of both bodies is
-- identical to 20261013_0003 and 20261013_0004.

begin;

create or replace function public.marketplace_actor_has_scope(
  p_member_issuer text,
  p_member_subject text,
  p_roles text[],
  p_enterprise_id uuid,
  p_project_id uuid,
  p_required_roles text[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if nullif(btrim(coalesce(p_member_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_member_subject, '')), '') is null
    or p_roles is null
    or p_enterprise_id is null
    or p_required_roles is null
    or cardinality(p_required_roles) = 0
    or array_position(p_roles, null) is not null
    or array_position(p_required_roles, null) is not null
  then
    return false;
  end if;

  if p_project_id is not null and not exists (
    select 1
    from public.enterprise_projects relation
    where relation.enterprise_id = p_enterprise_id
      and relation.project_id = p_project_id
  ) then
    return false;
  end if;

  if p_roles && array['platform_owner', 'internal_admin'] then
    return true;
  end if;

  -- moderator is global only for its own permissions: it skips the membership
  -- check only when the caller asks for the moderator role itself, so holding
  -- moderator next to a scoped role never widens that scoped role.
  if 'moderator' = any(p_roles) and 'moderator' = any(p_required_roles) then
    return true;
  end if;

  return exists (
    select 1
    from public.project_memberships membership
    where membership.member_issuer = p_member_issuer
      and membership.member_subject = p_member_subject
      and membership.status = 'active'
      and membership.enterprise_id = p_enterprise_id
      and membership.role = any(p_required_roles)
      and membership.role = any(p_roles)
      and (
        membership.scope_type = 'enterprise'
        or (
          p_project_id is not null
          and membership.scope_type = 'project'
          and membership.project_id = p_project_id
        )
      )
  );
end;
$$;


create or replace function public.marketplace_approve_activity_completion(
  p_completion_id uuid,
  p_actor_issuer text,
  p_actor_subject text,
  p_actor_roles text[],
  p_request_id text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_completion public.project_activity_completions;
  v_activity public.project_activities;
  v_project public.projects;
  v_enterprise_id uuid;
  v_is_global boolean;
  v_is_scoped boolean;
  v_reason text;
  v_period_count integer;
  v_lifetime_count integer;
  v_user_exists boolean;
  v_ledger_user_type text;
  v_ledger_entry_id uuid;
  v_idempotency_key text;
begin
  select * into v_completion
  from public.project_activity_completions completion
  where completion.id = p_completion_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reasonCode', 'COMPLETION_NOT_FOUND');
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_completion.activity_id::text || ':' || v_completion.user_id)
  );

  select * into v_activity
  from public.project_activities activity
  where activity.id = v_completion.activity_id
  for update;

  select * into v_project
  from public.projects project
  where project.id = v_completion.project_id;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = v_completion.project_id
    and relation.is_primary;

  -- moderator is no longer a global approver: it may not write the AIRS ledger.
  v_is_global := coalesce(p_actor_roles, '{}'::text[])
    && array['platform_owner', 'internal_admin'];

  select exists (
    select 1
    from public.project_memberships membership
    where membership.member_issuer = p_actor_issuer
      and membership.member_subject = p_actor_subject
      and membership.status = 'active'
      and membership.role in ('partner_operator', 'sub_admin')
      and membership.enterprise_id = v_enterprise_id
      and (
        membership.scope_type = 'enterprise'
        or (
          membership.scope_type = 'project'
          and membership.project_id = v_completion.project_id
        )
      )
  ) into v_is_scoped;

  if not v_is_global
    and not (
      coalesce(p_actor_roles, '{}'::text[]) && array['partner_operator', 'sub_admin']
      and v_is_scoped
    )
  then
    v_reason := 'PROJECT_SCOPE_DENIED';
  elsif v_completion.status = 'awarded' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'completionId', v_completion.id,
      'ledgerEntryId', v_completion.ledger_entry_id,
      'airsDelta', v_completion.awarded_airs
    );
  elsif v_completion.status <> 'pending' then
    v_reason := 'COMPLETION_STATUS_INVALID';
  elsif v_project.status <> 'published' or v_activity.status <> 'published' then
    v_reason := 'ACTIVITY_NOT_AWARDABLE';
  elsif v_activity.starts_at is not null and timezone('utc', now()) < v_activity.starts_at then
    v_reason := 'ACTIVITY_NOT_STARTED';
  elsif v_activity.ends_at is not null and timezone('utc', now()) >= v_activity.ends_at then
    v_reason := 'ACTIVITY_ENDED';
  end if;

  if v_reason is null then
    select count(*) into v_period_count
    from public.project_activity_completions completion
    where completion.activity_id = v_completion.activity_id
      and completion.user_id = v_completion.user_id
      and completion.period_key = v_completion.period_key
      and completion.status in ('awarded', 'reversed');

    select count(*) into v_lifetime_count
    from public.project_activity_completions completion
    where completion.activity_id = v_completion.activity_id
      and completion.user_id = v_completion.user_id
      and completion.status in ('awarded', 'reversed');

    if v_period_count >= v_activity.max_awards_per_period
      or (
        v_activity.max_awards_lifetime is not null
        and v_lifetime_count >= v_activity.max_awards_lifetime
      )
    then
      v_reason := 'ACTIVITY_AWARD_LIMIT_REACHED';
    end if;
  end if;

  if v_reason is null then
    execute 'select exists (select 1 from public.users app_user where app_user.id::text = $1)'
      into v_user_exists
      using v_completion.user_id;

    if not v_user_exists then
      v_reason := 'USER_NOT_ELIGIBLE';
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
      before_state
    ) values (
      p_actor_issuer,
      p_actor_subject,
      coalesce(p_actor_roles, '{}'::text[]),
      'airs_reward.issue_denied',
      'project_activity_completion',
      v_completion.id,
      v_enterprise_id,
      v_completion.project_id,
      p_request_id,
      'denied',
      v_reason,
      to_jsonb(v_completion)
    );

    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
    into v_ledger_user_type
  from pg_attribute attribute
  where attribute.attrelid = 'public.airs_ledger_entries'::regclass
    and attribute.attname = 'user_id'
    and not attribute.attisdropped;

  if v_ledger_user_type is null then
    raise exception 'AIRS_LEDGER_USER_TYPE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_idempotency_key := 'project-activity:' || v_completion.id::text || ':award';

  execute format(
    'insert into public.airs_ledger_entries (
       user_id,
       source_kind,
       source_ref,
       idempotency_key,
       source_currency,
       source_amount,
       airs_rate,
       airs_delta,
       notes,
       metadata
     ) values (
       ($1)::%s,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10
     )
     on conflict do nothing
     returning id',
    v_ledger_user_type
  )
  into v_ledger_entry_id
  using
    v_completion.user_id,
    'validated_regenerative_action',
    'project-activity:' || v_activity.id::text,
    v_idempotency_key,
    'AIRS',
    v_activity.default_airs_amount,
    1::numeric,
    v_activity.default_airs_amount,
    p_notes,
    jsonb_build_object(
      'projectId', v_completion.project_id,
      'activityId', v_completion.activity_id,
      'completionId', v_completion.id,
      'occurrenceKey', v_completion.occurrence_key,
      'periodKey', v_completion.period_key
    );

  if v_ledger_entry_id is null then
    select entry.id into v_ledger_entry_id
    from public.airs_ledger_entries entry
    where entry.user_id::text = v_completion.user_id
      and entry.idempotency_key = v_idempotency_key;
  end if;

  if v_ledger_entry_id is null then
    raise exception 'AIRS_LEDGER_WRITE_FAILED' using errcode = 'P0001';
  end if;

  update public.project_activity_completions completion
  set status = 'awarded',
      awarded_airs = v_activity.default_airs_amount,
      award_policy_snapshot = jsonb_build_object(
        'defaultAirsAmount', v_activity.default_airs_amount,
        'maxAirsPerAward', v_activity.max_airs_per_award,
        'repeatPeriod', v_activity.repeat_period,
        'maxAwardsPerPeriod', v_activity.max_awards_per_period,
        'maxAwardsLifetime', v_activity.max_awards_lifetime
      ),
      ledger_entry_id = v_ledger_entry_id,
      validated_by_issuer = p_actor_issuer,
      validated_by_subject = p_actor_subject,
      awarded_at = timezone('utc', now())
  where completion.id = v_completion.id
  returning * into v_completion;

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
    'airs_reward.issued',
    'project_activity_completion',
    v_completion.id,
    v_enterprise_id,
    v_completion.project_id,
    p_request_id,
    'allowed',
    to_jsonb(v_completion),
    jsonb_build_object('ledgerEntryId', v_ledger_entry_id)
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'completionId', v_completion.id,
    'ledgerEntryId', v_ledger_entry_id,
    'airsDelta', v_completion.awarded_airs
  );
end;
$$;


revoke all on function public.marketplace_actor_has_scope(
  text, text, text[], uuid, uuid, text[]
) from public, anon, authenticated;
revoke all on function public.marketplace_approve_activity_completion(
  uuid, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_actor_has_scope(
  text, text, text[], uuid, uuid, text[]
) to service_role;
grant execute on function public.marketplace_approve_activity_completion(
  uuid, text, text, text[], text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
