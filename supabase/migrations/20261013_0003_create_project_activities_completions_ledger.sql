-- Issue #249 project activities, recurring completions, and atomic AIRS writes.
--
-- public.users.id is intentionally represented as text without a foreign key.
-- The server-only RPCs compare IDs through ::text and dynamically cast to the
-- deployed airs_ledger_entries.user_id type, allowing this migration to compile
-- in environments where public.users.id is uuid or text.

begin;

create table public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null,
  status text not null default 'draft',
  default_locale text not null,
  content jsonb not null,
  default_airs_amount numeric(18,2) not null,
  max_airs_per_award numeric(18,2) not null,
  repeat_period text not null default 'none',
  max_awards_per_period integer not null default 1,
  max_awards_lifetime integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_issuer text not null,
  created_by_subject text not null,
  updated_by_issuer text not null,
  updated_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_activities_project_id_id_key unique (project_id, id),
  constraint project_activities_code_key unique (project_id, code),
  constraint project_activities_code_chk check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint project_activities_status_chk check (status in ('draft', 'published', 'paused', 'archived')),
  constraint project_activities_default_locale_chk check (default_locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint project_activities_content_chk check (
    jsonb_typeof(content) = 'object'
    and content ? default_locale
    and jsonb_typeof(content -> default_locale) = 'object'
  ),
  constraint project_activities_amount_chk check (
    default_airs_amount > 0
    and max_airs_per_award >= default_airs_amount
  ),
  constraint project_activities_repeat_period_chk check (
    repeat_period in ('none', 'day', 'week', 'month', 'assignment')
  ),
  constraint project_activities_award_limits_chk check (
    max_awards_per_period >= 1
    and (max_awards_lifetime is null or max_awards_lifetime >= 1)
    and (repeat_period <> 'none' or max_awards_per_period = 1)
  ),
  constraint project_activities_window_chk check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create table public.project_activity_completions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  activity_id uuid not null,
  user_id text not null,
  occurrence_key text not null,
  period_key text not null,
  assignment_key text,
  status text not null default 'pending',
  completed_at timestamptz not null default timezone('utc', now()),
  evidence_note text,
  evidence_url text,
  awarded_airs numeric(18,2),
  award_policy_snapshot jsonb,
  ledger_entry_id uuid unique references public.airs_ledger_entries(id) on delete restrict,
  reversal_ledger_entry_id uuid unique references public.airs_ledger_entries(id) on delete restrict,
  created_by_issuer text not null,
  created_by_subject text not null,
  validated_by_issuer text,
  validated_by_subject text,
  awarded_at timestamptz,
  rejected_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_activity_completions_project_activity_fk
    foreign key (project_id, activity_id)
    references public.project_activities(project_id, id)
    on delete cascade,
  constraint project_activity_completions_identity_chk check (char_length(btrim(user_id)) > 0),
  constraint project_activity_completions_occurrence_chk check (
    char_length(btrim(occurrence_key)) between 1 and 160
    and char_length(btrim(period_key)) between 1 and 80
  ),
  constraint project_activity_completions_status_chk check (
    status in ('pending', 'awarded', 'rejected', 'reversed')
  ),
  constraint project_activity_completions_evidence_url_chk check (
    evidence_url is null or evidence_url ~ '^https://[^[:space:]]+$'
  ),
  constraint project_activity_completions_state_chk check (
    (status = 'pending'
      and ledger_entry_id is null
      and reversal_ledger_entry_id is null
      and awarded_at is null
      and rejected_at is null
      and reversed_at is null)
    or (status = 'awarded'
      and ledger_entry_id is not null
      and reversal_ledger_entry_id is null
      and awarded_airs is not null
      and awarded_at is not null
      and rejected_at is null
      and reversed_at is null)
    or (status = 'rejected'
      and ledger_entry_id is null
      and reversal_ledger_entry_id is null
      and awarded_at is null
      and rejected_at is not null
      and reversed_at is null)
    or (status = 'reversed'
      and ledger_entry_id is not null
      and reversal_ledger_entry_id is not null
      and awarded_airs is not null
      and awarded_at is not null
      and rejected_at is null
      and reversed_at is not null)
  ),
  constraint project_activity_completions_user_occurrence_key
    unique (activity_id, user_id, occurrence_key)
);

comment on column public.project_activity_completions.user_id is
  'Stored as text without FK until public.users.id is verified in testnet and production.';

create index project_activity_completions_project_status_idx
  on public.project_activity_completions (project_id, status, completed_at desc);

create index project_activity_completions_user_period_idx
  on public.project_activity_completions (activity_id, user_id, period_key, status);

create trigger project_activities_set_updated_at
before update on public.project_activities
for each row execute function public.marketplace_set_updated_at();

create trigger project_activity_completions_set_updated_at
before update on public.project_activity_completions
for each row execute function public.marketplace_set_updated_at();

create or replace function public.marketplace_protect_published_project_slug()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.first_published_at is not null and new.slug is distinct from old.slug then
    raise exception 'PROJECT_SLUG_IMMUTABLE' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger projects_protect_published_slug
before update of slug on public.projects
for each row execute function public.marketplace_protect_published_project_slug();

create or replace function public.marketplace_transition_project_status(
  p_project_id uuid,
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
  v_before public.projects;
  v_after public.projects;
  v_enterprise_id uuid;
  v_reason text;
begin
  select * into v_before
  from public.projects project
  where project.id = p_project_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_NOT_FOUND');
  end if;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  join public.enterprises enterprise on enterprise.id = relation.enterprise_id
  where relation.project_id = p_project_id
    and relation.is_primary
    and enterprise.status = 'active';

  if not (
    coalesce(p_actor_roles, '{}'::text[])
    && array['platform_owner', 'internal_admin']
  ) then
    v_reason := 'PERMISSION_DENIED';
  elsif p_target_status not in ('draft', 'published', 'paused', 'archived') then
    v_reason := 'PROJECT_STATUS_TRANSITION_INVALID';
  elsif v_before.status = p_target_status then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'project', to_jsonb(v_before)
    );
  elsif not (
    (v_before.status = 'draft' and p_target_status in ('published', 'archived'))
    or (v_before.status = 'published' and p_target_status in ('paused', 'archived'))
    or (v_before.status = 'paused' and p_target_status in ('published', 'archived'))
  ) then
    v_reason := 'PROJECT_STATUS_TRANSITION_INVALID';
  elsif p_target_status = 'published' and v_enterprise_id is null then
    v_reason := 'PRIMARY_ENTERPRISE_REQUIRED';
  elsif p_target_status = 'published'
    and (
      not (v_before.content ? v_before.default_locale)
      or jsonb_typeof(v_before.content -> v_before.default_locale) <> 'object'
      or nullif(btrim(v_before.content -> v_before.default_locale ->> 'title'), '') is null
      or nullif(btrim(v_before.content -> v_before.default_locale ->> 'location'), '') is null
      or nullif(btrim(v_before.content -> v_before.default_locale ->> 'theme'), '') is null
      or nullif(btrim(v_before.content -> v_before.default_locale ->> 'description'), '') is null
      or coalesce(
        jsonb_array_length(
          case
            when jsonb_typeof(
              v_before.content -> v_before.default_locale -> 'waysToContribute'
            ) = 'array'
              then v_before.content -> v_before.default_locale -> 'waysToContribute'
            else '[]'::jsonb
          end
        ),
        0
      ) = 0
    )
  then
    v_reason := 'DEFAULT_TRANSLATION_REQUIRED';
  elsif p_target_status in ('paused', 'archived')
    and nullif(btrim(coalesce(p_reason, '')), '') is null
  then
    v_reason := 'STATUS_REASON_REQUIRED';
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
      'project.status_change_denied',
      'project',
      v_before.id,
      v_enterprise_id,
      v_before.id,
      p_request_id,
      'denied',
      v_reason,
      to_jsonb(v_before),
      jsonb_build_object('targetStatus', p_target_status, 'reason', p_reason)
    );

    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  update public.projects project
  set status = p_target_status,
      first_published_at = case
        when p_target_status = 'published'
          then coalesce(project.first_published_at, timezone('utc', now()))
        else project.first_published_at
      end,
      published_at = case
        when p_target_status = 'published' then timezone('utc', now())
        else null
      end,
      updated_by_issuer = p_actor_issuer,
      updated_by_subject = p_actor_subject
  where project.id = p_project_id
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
    case p_target_status
      when 'published' then case
        when v_before.status = 'paused' then 'project.resumed'
        else 'project.published'
      end
      when 'paused' then 'project.paused'
      when 'archived' then 'project.archived'
      else 'project.updated'
    end,
    'project',
    v_after.id,
    v_enterprise_id,
    v_after.id,
    p_request_id,
    'allowed',
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'idempotent', false, 'project', to_jsonb(v_after));
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

  v_is_global := coalesce(p_actor_roles, '{}'::text[])
    && array['platform_owner', 'internal_admin', 'moderator'];

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

create or replace function public.marketplace_reverse_activity_completion(
  p_completion_id uuid,
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
  v_completion public.project_activity_completions;
  v_enterprise_id uuid;
  v_original_user_id text;
  v_original_delta numeric(18,2);
  v_ledger_user_type text;
  v_reversal_id uuid;
  v_idempotency_key text;
  v_reason text;
begin
  select * into v_completion
  from public.project_activity_completions completion
  where completion.id = p_completion_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reasonCode', 'COMPLETION_NOT_FOUND');
  end if;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = v_completion.project_id
    and relation.is_primary;

  if not ('platform_owner' = any(coalesce(p_actor_roles, '{}'::text[]))) then
    v_reason := 'PERMISSION_DENIED';
  elsif v_completion.status = 'reversed' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'completionId', v_completion.id,
      'reversalLedgerEntryId', v_completion.reversal_ledger_entry_id,
      'airsDelta', -abs(v_completion.awarded_airs)
    );
  elsif v_completion.status <> 'awarded' or v_completion.ledger_entry_id is null then
    v_reason := 'AIRS_NOT_AWARDED';
  elsif nullif(btrim(coalesce(p_reason, '')), '') is null then
    v_reason := 'REVERSAL_REASON_REQUIRED';
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
      'airs_reward.reversal_denied',
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

  select entry.user_id::text, entry.airs_delta
    into v_original_user_id, v_original_delta
  from public.airs_ledger_entries entry
  where entry.id = v_completion.ledger_entry_id;

  if v_original_user_id is null or v_original_delta is null then
    raise exception 'ORIGINAL_AIRS_LEDGER_ENTRY_NOT_FOUND' using errcode = 'P0002';
  end if;

  select format_type(attribute.atttypid, attribute.atttypmod)
    into v_ledger_user_type
  from pg_attribute attribute
  where attribute.attrelid = 'public.airs_ledger_entries'::regclass
    and attribute.attname = 'user_id'
    and not attribute.attisdropped;

  v_idempotency_key := 'project-activity:' || v_completion.id::text || ':reversal:v1';

  execute format(
    'insert into public.airs_ledger_entries (
       user_id,
       source_kind,
       source_ref,
       idempotency_key,
       source_currency,
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
       $9
     )
     on conflict do nothing
     returning id',
    v_ledger_user_type
  )
  into v_reversal_id
  using
    v_original_user_id,
    'correction',
    v_completion.ledger_entry_id::text,
    v_idempotency_key,
    'AIRS',
    1::numeric,
    -abs(v_original_delta),
    p_reason,
    jsonb_build_object(
      'originalLedgerEntryId', v_completion.ledger_entry_id,
      'projectId', v_completion.project_id,
      'activityId', v_completion.activity_id,
      'completionId', v_completion.id,
      'reason', p_reason
    );

  if v_reversal_id is null then
    select entry.id into v_reversal_id
    from public.airs_ledger_entries entry
    where entry.user_id::text = v_original_user_id
      and entry.idempotency_key = v_idempotency_key;
  end if;

  if v_reversal_id is null then
    raise exception 'AIRS_REVERSAL_WRITE_FAILED' using errcode = 'P0001';
  end if;

  update public.project_activity_completions completion
  set status = 'reversed',
      reversal_ledger_entry_id = v_reversal_id,
      reversed_at = timezone('utc', now()),
      validated_by_issuer = p_actor_issuer,
      validated_by_subject = p_actor_subject
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
    'airs_reward.reversal_posted',
    'project_activity_completion',
    v_completion.id,
    v_enterprise_id,
    v_completion.project_id,
    p_request_id,
    'allowed',
    to_jsonb(v_completion),
    jsonb_build_object(
      'originalLedgerEntryId', v_completion.ledger_entry_id,
      'reversalLedgerEntryId', v_reversal_id,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'completionId', v_completion.id,
    'reversalLedgerEntryId', v_reversal_id,
    'airsDelta', -abs(v_original_delta)
  );
end;
$$;

insert into public.project_activities (
  id,
  project_id,
  code,
  status,
  default_locale,
  content,
  default_airs_amount,
  max_airs_per_award,
  repeat_period,
  max_awards_per_period,
  max_awards_lifetime,
  created_by_issuer,
  created_by_subject,
  updated_by_issuer,
  updated_by_subject
)
values (
  '24900000-0000-4000-8000-000000000004',
  '24900000-0000-4000-8000-000000000002',
  'participacion-piloto',
  'draft',
  'es',
  '{
    "es": {
      "title": "Participaci\u00f3n en Eco Turismo",
      "description": "Actividad piloto para validar una contribuci\u00f3n al proyecto.",
      "instructions": "El administrador valida la evidencia y la API registra los AIRS."
    },
    "en": {
      "title": "Eco Tourism participation",
      "description": "Pilot activity for validating a contribution to the project.",
      "instructions": "The administrator validates the evidence and the API records AIRS."
    },
    "th": {
      "title": "\u0e01\u0e32\u0e23\u0e21\u0e35\u0e2a\u0e48\u0e27\u0e19\u0e23\u0e48\u0e27\u0e21\u0e43\u0e19\u0e2d\u0e35\u0e42\u0e04\u0e17\u0e31\u0e27\u0e23\u0e34\u0e0b\u0e36\u0e21",
      "description": "\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21\u0e19\u0e33\u0e23\u0e48\u0e2d\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e21\u0e35\u0e2a\u0e48\u0e27\u0e19\u0e23\u0e48\u0e27\u0e21\u0e43\u0e19\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23",
      "instructions": "\u0e1c\u0e39\u0e49\u0e14\u0e39\u0e41\u0e25\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e41\u0e25\u0e30 API \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 AIRS"
    }
  }'::jsonb,
  10,
  10,
  'assignment',
  1,
  null,
  'system',
  'issue-249-seed',
  'system',
  'issue-249-seed'
);

alter table public.project_activities enable row level security;
alter table public.project_activity_completions enable row level security;

revoke all on table public.project_activities from public, anon, authenticated;
revoke all on table public.project_activity_completions from public, anon, authenticated;
grant select, insert, update, delete on table public.project_activities to service_role;
grant select, insert, update, delete on table public.project_activity_completions to service_role;

revoke all on function public.marketplace_approve_activity_completion(
  uuid, text, text, text[], text, text
) from public, anon, authenticated;
revoke all on function public.marketplace_reverse_activity_completion(
  uuid, text, text, text[], text, text
) from public, anon, authenticated;
revoke all on function public.marketplace_transition_project_status(
  uuid, text, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_approve_activity_completion(
  uuid, text, text, text[], text, text
) to service_role;
grant execute on function public.marketplace_reverse_activity_completion(
  uuid, text, text, text[], text, text
) to service_role;
grant execute on function public.marketplace_transition_project_status(
  uuid, text, text, text, text[], text, text
) to service_role;

revoke all on function public.marketplace_protect_published_project_slug()
  from public, anon, authenticated;
grant execute on function public.marketplace_protect_published_project_slug()
  to service_role;

notify pgrst, 'reload schema';

commit;
