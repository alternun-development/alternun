-- Issue #249 atomic marketplace mutations not safely expressible as multiple
-- PostgREST calls. Every function is server-only and writes its audit record
-- in the same database transaction as the domain mutation.

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

  if p_roles && array['platform_owner', 'internal_admin', 'moderator'] then
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

create or replace function public.marketplace_create_project(
  p_enterprise_id uuid,
  p_slug text,
  p_category_code text,
  p_country_code text,
  p_time_zone text,
  p_default_locale text,
  p_content jsonb,
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
  v_enterprise public.enterprises;
  v_project public.projects;
  v_reason text;
  v_authorized boolean;
begin
  select * into v_enterprise
  from public.enterprises enterprise
  where enterprise.id = p_enterprise_id
  for update;

  if not found then
    v_reason := 'ENTERPRISE_NOT_FOUND';
  elsif v_enterprise.status <> 'active' then
    v_reason := 'ENTERPRISE_NOT_ACTIVE';
  else
    v_authorized :=
      coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin']
      or (
        coalesce(
          'partner_operator' = any(coalesce(p_actor_roles, '{}'::text[])),
          false
        )
        and public.marketplace_actor_has_scope(
          p_actor_issuer,
          p_actor_subject,
          p_actor_roles,
          p_enterprise_id,
          null,
          array['partner_operator']
        )
      );

    if not coalesce(v_authorized, false) then
      v_reason := 'ENTERPRISE_SCOPE_DENIED';
    elsif nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
      or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
      or p_slug is null
      or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or char_length(p_slug) not between 3 and 80
      or p_country_code is not null and p_country_code !~ '^[A-Z]{2}$'
      or nullif(btrim(coalesce(p_time_zone, '')), '') is null
      or char_length(p_time_zone) > 80
      or p_default_locale is null
      or p_default_locale !~ '^[a-z]{2}(?:-[A-Z]{2})?$'
    then
      v_reason := 'VALIDATION_FAILED';
    elsif p_category_code is null or not exists (
      select 1
      from public.project_categories category
      where category.code = p_category_code
        and category.is_active
    ) then
      v_reason := 'CATEGORY_UNSUPPORTED';
    elsif p_content is null
      or jsonb_typeof(p_content) is distinct from 'object'
      or p_content = '{}'::jsonb
      or not (p_content ? p_default_locale)
      or exists (
        select 1
        from jsonb_each(
          case
            when jsonb_typeof(p_content) = 'object' then p_content
            else '{}'::jsonb
          end
        ) localized(locale, block)
        where localized.locale !~ '^[a-z]{2}(?:-[A-Z]{2})?$'
          or jsonb_typeof(localized.block) is distinct from 'object'
          or jsonb_typeof(localized.block -> 'title') is distinct from 'string'
          or char_length(btrim(localized.block ->> 'title')) not between 1 and 120
          or jsonb_typeof(localized.block -> 'location') is distinct from 'string'
          or char_length(btrim(localized.block ->> 'location')) not between 1 and 120
          or jsonb_typeof(localized.block -> 'theme') is distinct from 'string'
          or char_length(btrim(localized.block ->> 'theme')) not between 1 and 120
          or jsonb_typeof(localized.block -> 'description') is distinct from 'string'
          or char_length(btrim(localized.block ->> 'description')) not between 1 and 4000
          or jsonb_typeof(localized.block -> 'waysToContribute') is distinct from 'array'
          or jsonb_array_length(
            case
              when jsonb_typeof(localized.block -> 'waysToContribute') = 'array'
                then localized.block -> 'waysToContribute'
              else '[]'::jsonb
            end
          ) not between 1 and 8
          or exists (
            select 1
            from jsonb_array_elements(
              case
                when jsonb_typeof(localized.block -> 'waysToContribute') = 'array'
                  then localized.block -> 'waysToContribute'
                else '[]'::jsonb
              end
            ) contribution
            where jsonb_typeof(contribution) is distinct from 'string'
              or char_length(btrim(contribution #>> '{}')) not between 1 and 160
          )
          or localized.block ? 'participationCopy'
            and (
              jsonb_typeof(localized.block -> 'participationCopy') is distinct from 'string'
              or char_length(localized.block ->> 'participationCopy') > 2000
            )
          or localized.block ? 'ctaLabel'
            and (
              jsonb_typeof(localized.block -> 'ctaLabel') is distinct from 'string'
              or char_length(localized.block ->> 'ctaLabel') > 80
            )
      )
    then
      v_reason := 'DEFAULT_TRANSLATION_REQUIRED';
    elsif exists (
      select 1 from public.projects project where project.slug = p_slug
    ) then
      v_reason := 'PROJECT_SLUG_CONFLICT';
    end if;
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer,
      actor_subject,
      actor_roles,
      action,
      target_type,
      enterprise_id,
      request_id,
      result,
      reason_code,
      metadata
    ) values (
      p_actor_issuer,
      p_actor_subject,
      coalesce(p_actor_roles, '{}'::text[]),
      'project.create_denied',
      'project',
      v_enterprise.id,
      p_request_id,
      'denied',
      v_reason,
      jsonb_build_object(
        'requestedEnterpriseId', p_enterprise_id,
        'requestedSlug', p_slug,
        'requestedCategoryCode', p_category_code
      )
    );

    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  begin
    insert into public.projects (
      slug,
      status,
      category_code,
      country_code,
      time_zone,
      default_locale,
      content,
      created_by_issuer,
      created_by_subject,
      updated_by_issuer,
      updated_by_subject
    ) values (
      p_slug,
      'draft',
      p_category_code,
      p_country_code,
      p_time_zone,
      p_default_locale,
      p_content,
      p_actor_issuer,
      p_actor_subject,
      p_actor_issuer,
      p_actor_subject
    )
    returning * into v_project;
  exception
    when unique_violation then
      insert into public.admin_audit_log (
        actor_issuer,
        actor_subject,
        actor_roles,
        action,
        target_type,
        enterprise_id,
        request_id,
        result,
        reason_code,
        metadata
      ) values (
        p_actor_issuer,
        p_actor_subject,
        coalesce(p_actor_roles, '{}'::text[]),
        'project.create_denied',
        'project',
        v_enterprise.id,
        p_request_id,
        'denied',
        'PROJECT_SLUG_CONFLICT',
        jsonb_build_object('requestedSlug', p_slug)
      );
      return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_SLUG_CONFLICT');
  end;

  insert into public.enterprise_projects (
    enterprise_id,
    project_id,
    relation,
    is_primary,
    created_by_issuer,
    created_by_subject
  ) values (
    v_enterprise.id,
    v_project.id,
    'owner',
    true,
    p_actor_issuer,
    p_actor_subject
  );

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
    after_state
  ) values (
    p_actor_issuer,
    p_actor_subject,
    coalesce(p_actor_roles, '{}'::text[]),
    'project.created',
    'project',
    v_project.id,
    v_enterprise.id,
    v_project.id,
    p_request_id,
    'allowed',
    to_jsonb(v_project)
  );

  return jsonb_build_object('ok', true, 'project', to_jsonb(v_project));
end;
$$;

create or replace function public.marketplace_update_project(
  p_project_id uuid,
  p_patch jsonb,
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
  v_before public.projects;
  v_after public.projects;
  v_enterprise_id uuid;
  v_reason text;
  v_full_access boolean;
  v_content_access boolean;
  v_content_only boolean;
  v_slug text;
  v_category_code text;
  v_country_code text;
  v_time_zone text;
  v_default_locale text;
  v_content jsonb;
begin
  select * into v_before
  from public.projects project
  where project.id = p_project_id
  for update;

  if not found then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      request_id, result, reason_code
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'project.update_denied', 'project', p_project_id, p_request_id, 'denied',
      'PROJECT_NOT_FOUND'
    );
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_NOT_FOUND');
  end if;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = p_project_id
    and relation.is_primary;

  v_content_only := p_patch is not null
    and jsonb_typeof(p_patch) = 'object'
    and p_patch <> '{}'::jsonb
    and not exists (
      select 1
      from jsonb_object_keys(
        case
          when jsonb_typeof(p_patch) = 'object' then p_patch
          else '{}'::jsonb
        end
      ) field_name
      where field_name <> 'content'
    );

  v_full_access :=
    coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin']
    or (
      coalesce('partner_operator' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and public.marketplace_actor_has_scope(
        p_actor_issuer, p_actor_subject, p_actor_roles, v_enterprise_id,
        p_project_id, array['partner_operator']
      )
    );

  v_content_access := v_full_access
    or coalesce('moderator' = any(coalesce(p_actor_roles, '{}'::text[])), false)
    or (
      coalesce('sub_admin' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and public.marketplace_actor_has_scope(
        p_actor_issuer, p_actor_subject, p_actor_roles, v_enterprise_id,
        p_project_id, array['sub_admin']
      )
    );

  if nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_patch is null
    or jsonb_typeof(p_patch) is distinct from 'object'
    or p_patch = '{}'::jsonb
    or exists (
      select 1
      from jsonb_object_keys(
        case
          when jsonb_typeof(p_patch) = 'object' then p_patch
          else '{}'::jsonb
        end
      ) field_name
      where field_name not in (
        'slug', 'categoryCode', 'countryCode', 'timeZone', 'defaultLocale', 'content'
      )
    )
  then
    v_reason := 'VALIDATION_FAILED';
  elsif not coalesce(v_content_access, false) then
    v_reason := 'PROJECT_SCOPE_DENIED';
  elsif not coalesce(v_full_access, false) and not v_content_only then
    v_reason := 'PROTECTED_FIELD_WRITE_DENIED';
  elsif p_patch ? 'slug'
    and (
      jsonb_typeof(p_patch -> 'slug') is distinct from 'string'
      or char_length(p_patch ->> 'slug') not between 3 and 80
      or (p_patch ->> 'slug') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  then
    v_reason := 'VALIDATION_FAILED';
  elsif p_patch ? 'slug'
    and v_before.first_published_at is not null
    and p_patch ->> 'slug' is distinct from v_before.slug
  then
    v_reason := 'PROJECT_SLUG_IMMUTABLE';
  elsif p_patch ? 'slug' and exists (
    select 1
    from public.projects project
    where project.slug = p_patch ->> 'slug'
      and project.id <> p_project_id
  ) then
    v_reason := 'PROJECT_SLUG_CONFLICT';
  elsif p_patch ? 'categoryCode'
    and (
      jsonb_typeof(p_patch -> 'categoryCode') is distinct from 'string'
      or not exists (
        select 1
        from public.project_categories category
        where category.code = p_patch ->> 'categoryCode'
          and category.is_active
      )
    )
  then
    v_reason := 'CATEGORY_UNSUPPORTED';
  elsif p_patch ? 'countryCode'
    and jsonb_typeof(p_patch -> 'countryCode') not in ('string', 'null')
  then
    v_reason := 'VALIDATION_FAILED';
  elsif p_patch ? 'countryCode'
    and jsonb_typeof(p_patch -> 'countryCode') = 'string'
    and (p_patch ->> 'countryCode') !~ '^[A-Z]{2}$'
  then
    v_reason := 'VALIDATION_FAILED';
  elsif p_patch ? 'timeZone'
    and (
      jsonb_typeof(p_patch -> 'timeZone') is distinct from 'string'
      or char_length(btrim(p_patch ->> 'timeZone')) not between 1 and 80
    )
  then
    v_reason := 'VALIDATION_FAILED';
  elsif p_patch ? 'defaultLocale'
    and (
      jsonb_typeof(p_patch -> 'defaultLocale') is distinct from 'string'
      or (p_patch ->> 'defaultLocale') !~ '^[a-z]{2}(?:-[A-Z]{2})?$'
    )
  then
    v_reason := 'VALIDATION_FAILED';
  end if;

  v_slug := case when p_patch ? 'slug' then p_patch ->> 'slug' else v_before.slug end;
  v_category_code := case
    when p_patch ? 'categoryCode' then p_patch ->> 'categoryCode'
    else v_before.category_code
  end;
  v_country_code := case
    when p_patch ? 'countryCode' then p_patch ->> 'countryCode'
    else v_before.country_code
  end;
  v_time_zone := case
    when p_patch ? 'timeZone' then p_patch ->> 'timeZone'
    else v_before.time_zone
  end;
  v_default_locale := case
    when p_patch ? 'defaultLocale' then p_patch ->> 'defaultLocale'
    else v_before.default_locale
  end;
  v_content := case when p_patch ? 'content' then p_patch -> 'content' else v_before.content end;

  if v_reason is null and (
    v_content is null
    or jsonb_typeof(v_content) is distinct from 'object'
    or v_content = '{}'::jsonb
    or not (v_content ? v_default_locale)
    or exists (
      select 1
      from jsonb_each(
        case
          when jsonb_typeof(v_content) = 'object' then v_content
          else '{}'::jsonb
        end
      ) localized(locale, block)
      where localized.locale !~ '^[a-z]{2}(?:-[A-Z]{2})?$'
        or jsonb_typeof(localized.block) is distinct from 'object'
        or jsonb_typeof(localized.block -> 'title') is distinct from 'string'
        or char_length(btrim(localized.block ->> 'title')) not between 1 and 120
        or jsonb_typeof(localized.block -> 'location') is distinct from 'string'
        or char_length(btrim(localized.block ->> 'location')) not between 1 and 120
        or jsonb_typeof(localized.block -> 'theme') is distinct from 'string'
        or char_length(btrim(localized.block ->> 'theme')) not between 1 and 120
        or jsonb_typeof(localized.block -> 'description') is distinct from 'string'
        or char_length(btrim(localized.block ->> 'description')) not between 1 and 4000
        or jsonb_typeof(localized.block -> 'waysToContribute') is distinct from 'array'
        or jsonb_array_length(
          case
            when jsonb_typeof(localized.block -> 'waysToContribute') = 'array'
              then localized.block -> 'waysToContribute'
            else '[]'::jsonb
          end
        ) not between 1 and 8
        or exists (
          select 1
          from jsonb_array_elements(
            case
              when jsonb_typeof(localized.block -> 'waysToContribute') = 'array'
                then localized.block -> 'waysToContribute'
              else '[]'::jsonb
            end
          ) contribution
          where jsonb_typeof(contribution) is distinct from 'string'
            or char_length(btrim(contribution #>> '{}')) not between 1 and 160
        )
        or localized.block ? 'participationCopy'
          and (
            jsonb_typeof(localized.block -> 'participationCopy') is distinct from 'string'
            or char_length(localized.block ->> 'participationCopy') > 2000
          )
        or localized.block ? 'ctaLabel'
          and (
            jsonb_typeof(localized.block -> 'ctaLabel') is distinct from 'string'
            or char_length(localized.block ->> 'ctaLabel') > 80
          )
    )
  ) then
    v_reason := 'DEFAULT_TRANSLATION_REQUIRED';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, project_id, request_id, result, reason_code, before_state,
      metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      case
        when v_reason = 'PROTECTED_FIELD_WRITE_DENIED'
          then 'project.protected_field_write_denied'
        else 'project.update_denied'
      end,
      'project', v_before.id, v_enterprise_id, v_before.id,
      p_request_id, 'denied', v_reason, to_jsonb(v_before),
      jsonb_build_object('requestedFields', coalesce(
        (select jsonb_agg(field_name order by field_name) from jsonb_object_keys(
          case when jsonb_typeof(p_patch) = 'object' then p_patch else '{}'::jsonb end
        ) field_name),
        '[]'::jsonb
      ))
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  begin
    update public.projects project
    set slug = v_slug,
        category_code = v_category_code,
        country_code = v_country_code,
        time_zone = v_time_zone,
        default_locale = v_default_locale,
        content = v_content,
        updated_by_issuer = p_actor_issuer,
        updated_by_subject = p_actor_subject
    where project.id = p_project_id
    returning * into v_after;
  exception
    when unique_violation then
      insert into public.admin_audit_log (
        actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
        enterprise_id, project_id, request_id, result, reason_code, before_state
      ) values (
        p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
        'project.update_denied', 'project', v_before.id, v_enterprise_id, v_before.id,
        p_request_id, 'denied', 'PROJECT_SLUG_CONFLICT', to_jsonb(v_before)
      );
      return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_SLUG_CONFLICT');
  end;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, project_id, request_id, result, before_state, after_state
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'project.updated', 'project', v_after.id, v_enterprise_id, v_after.id,
    p_request_id, 'allowed', to_jsonb(v_before), to_jsonb(v_after)
  );

  return jsonb_build_object('ok', true, 'project', to_jsonb(v_after));
end;
$$;

create or replace function public.marketplace_reorder_project_media(
  p_project_id uuid,
  p_items jsonb,
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
  v_enterprise_id uuid;
  v_reason text;
  v_authorized boolean;
  v_requested_count integer;
  v_gallery_count integer;
  v_before jsonb;
  v_after jsonb;
begin
  select * into v_project
  from public.projects project
  where project.id = p_project_id
  for update;

  if not found then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      request_id, result, reason_code
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'project_media.reorder_denied', 'project', p_project_id, p_request_id,
      'denied', 'PROJECT_NOT_FOUND'
    );
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_NOT_FOUND');
  end if;

  select relation.enterprise_id into v_enterprise_id
  from public.enterprise_projects relation
  where relation.project_id = p_project_id
    and relation.is_primary;

  v_authorized :=
    coalesce(p_actor_roles, '{}'::text[]) && array[
      'platform_owner', 'internal_admin', 'moderator'
    ]
    or (
      coalesce('partner_operator' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and public.marketplace_actor_has_scope(
        p_actor_issuer, p_actor_subject, p_actor_roles, v_enterprise_id,
        p_project_id, array['partner_operator']
      )
    )
    or (
      coalesce('sub_admin' = any(coalesce(p_actor_roles, '{}'::text[])), false)
      and public.marketplace_actor_has_scope(
        p_actor_issuer, p_actor_subject, p_actor_roles, v_enterprise_id,
        p_project_id, array['sub_admin']
      )
    );

  if not coalesce(v_authorized, false) then
    v_reason := 'PROJECT_SCOPE_DENIED';
  elsif nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
    or p_items is null
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(
      case
        when jsonb_typeof(p_items) = 'array' then p_items
        else '[]'::jsonb
      end
    ) = 0
    or exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(p_items) = 'array' then p_items
          else '[]'::jsonb
        end
      ) item
      where jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item -> 'id') is distinct from 'string'
        or (item ->> 'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(item -> 'sortOrder') is distinct from 'number'
        or (item ->> 'sortOrder') !~ '^[0-9]+$'
        or case
          when (item ->> 'sortOrder') ~ '^[0-9]+$'
            then (item ->> 'sortOrder')::numeric > 2147483647
          else false
        end
    )
  then
    v_reason := 'MEDIA_ORDER_INVALID';
  end if;

  if v_reason is null then
    select count(*), count(distinct item ->> 'id')
      into v_requested_count, v_gallery_count
    from jsonb_array_elements(p_items) item;

    if v_requested_count <> v_gallery_count then
      v_reason := 'MEDIA_ORDER_INVALID';
    end if;
  end if;

  if v_reason is null then
    select count(*) into v_gallery_count
    from public.project_media media
    where media.project_id = p_project_id
      and media.kind = 'gallery_image'
      and media.is_active;

    if v_requested_count <> v_gallery_count
      or exists (
        select 1
        from jsonb_array_elements(p_items) item
        left join public.project_media media
          on media.id = (item ->> 'id')::uuid
          and media.project_id = p_project_id
          and media.kind = 'gallery_image'
          and media.is_active
        where media.id is null
      )
    then
      v_reason := 'MEDIA_ORDER_INVALID';
    end if;
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type,
      enterprise_id, project_id, request_id, result, reason_code, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'project_media.reorder_denied', 'project_media', v_enterprise_id,
      p_project_id, p_request_id, 'denied', v_reason,
      jsonb_build_object('items', p_items)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  select coalesce(jsonb_agg(to_jsonb(media) order by media.sort_order, media.id), '[]'::jsonb)
    into v_before
  from public.project_media media
  where media.project_id = p_project_id
    and media.kind = 'gallery_image'
    and media.is_active;

  with requested as (
    select (item ->> 'id')::uuid as id, (item ->> 'sortOrder')::integer as sort_order
    from jsonb_array_elements(p_items) item
  )
  update public.project_media media
  set sort_order = requested.sort_order,
      updated_by_issuer = p_actor_issuer,
      updated_by_subject = p_actor_subject
  from requested
  where media.id = requested.id
    and media.project_id = p_project_id;

  select coalesce(jsonb_agg(to_jsonb(media) order by media.sort_order, media.id), '[]'::jsonb)
    into v_after
  from public.project_media media
  where media.project_id = p_project_id
    and media.kind = 'gallery_image'
    and media.is_active;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type,
    enterprise_id, project_id, request_id, result, before_state, after_state
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'project_media.reordered', 'project_media', v_enterprise_id, p_project_id,
    p_request_id, 'allowed', jsonb_build_object('media', v_before),
    jsonb_build_object('media', v_after)
  );

  return jsonb_build_object('ok', true, 'media', v_after);
end;
$$;

create or replace function public.marketplace_set_enterprise_status(
  p_enterprise_id uuid,
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
  v_before public.enterprises;
  v_after public.enterprises;
  v_reason text;
  v_published_project_ids jsonb;
  v_published_project_count integer;
begin
  select * into v_before
  from public.enterprises enterprise
  where enterprise.id = p_enterprise_id
  for update;

  if not found then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      request_id, result, reason_code
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'enterprise.status_change_denied', 'enterprise', p_enterprise_id,
      p_request_id, 'denied', 'ENTERPRISE_NOT_FOUND'
    );
    return jsonb_build_object('ok', false, 'reasonCode', 'ENTERPRISE_NOT_FOUND');
  end if;

  if not (
    coalesce(p_actor_roles, '{}'::text[]) && array['platform_owner', 'internal_admin']
  ) then
    v_reason := 'PERMISSION_DENIED';
  elsif p_target_status is null or p_target_status not in ('active', 'paused', 'archived') then
    v_reason := 'VALIDATION_FAILED';
  elsif nullif(btrim(coalesce(p_actor_issuer, '')), '') is null
    or nullif(btrim(coalesce(p_actor_subject, '')), '') is null
  then
    v_reason := 'VALIDATION_FAILED';
  elsif p_target_status in ('paused', 'archived')
    and nullif(btrim(coalesce(p_reason, '')), '') is null
  then
    v_reason := 'STATUS_REASON_REQUIRED';
  end if;

  if v_reason is not null then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, request_id, result, reason_code, before_state, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'enterprise.status_change_denied', 'enterprise', v_before.id, v_before.id,
      p_request_id, 'denied', v_reason, to_jsonb(v_before),
      jsonb_build_object('targetStatus', p_target_status, 'reason', p_reason)
    );
    return jsonb_build_object('ok', false, 'reasonCode', v_reason);
  end if;

  select count(*), coalesce(jsonb_agg(project.id order by project.id), '[]'::jsonb)
    into v_published_project_count, v_published_project_ids
  from public.enterprise_projects relation
  join public.projects project on project.id = relation.project_id
  where relation.enterprise_id = p_enterprise_id
    and relation.is_primary
    and project.status = 'published';

  if v_before.status = p_target_status then
    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, request_id, result, before_state, after_state, metadata
    ) values (
      p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
      'enterprise.status_unchanged', 'enterprise', v_before.id, v_before.id,
      p_request_id, 'allowed', to_jsonb(v_before), to_jsonb(v_before),
      jsonb_build_object(
        'targetStatus', p_target_status,
        'reason', p_reason,
        'publishedProjectCount', v_published_project_count,
        'publishedProjectIds', v_published_project_ids,
        'publishedProjectsAction', 'left_published'
      )
    );
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'enterprise', to_jsonb(v_before),
      'publishedProjectCount', v_published_project_count
    );
  end if;

  update public.enterprises enterprise
  set status = p_target_status,
      updated_by_issuer = p_actor_issuer,
      updated_by_subject = p_actor_subject
  where enterprise.id = p_enterprise_id
  returning * into v_after;

  insert into public.admin_audit_log (
    actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
    enterprise_id, request_id, result, before_state, after_state, metadata
  ) values (
    p_actor_issuer, p_actor_subject, coalesce(p_actor_roles, '{}'::text[]),
    'enterprise.status_changed', 'enterprise', v_after.id, v_after.id,
    p_request_id, 'allowed', to_jsonb(v_before), to_jsonb(v_after),
    jsonb_build_object(
      'reason', p_reason,
      'publishedProjectCount', v_published_project_count,
      'publishedProjectIds', v_published_project_ids,
      'publishedProjectsAction', 'left_published'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'enterprise', to_jsonb(v_after),
    'publishedProjectCount', v_published_project_count,
    'publishedProjectIds', v_published_project_ids
  );
end;
$$;

comment on function public.marketplace_set_enterprise_status(
  uuid, text, text, text, text[], text, text
) is
  'Pausing or archiving blocks future publish/resume through marketplace_transition_project_status. Existing published projects remain published; their count and IDs are audited for Edward to decide whether a later cascade is required.';

-- Deliberately still direct through service-role PostgREST: enterprise
-- create/update and project_media create/retire each mutate one constrained row.
-- Their API audit insert is a second, non-atomic call. They remain outside this
-- migration's minimum atomic set; Edward must decide whether strict audit
-- atomicity justifies follow-up RPCs for those simple mutations.

revoke all on function public.marketplace_actor_has_scope(
  text, text, text[], uuid, uuid, text[]
) from public, anon, authenticated;
revoke all on function public.marketplace_create_project(
  uuid, text, text, text, text, text, jsonb, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_update_project(
  uuid, jsonb, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_reorder_project_media(
  uuid, jsonb, text, text, text[], text
) from public, anon, authenticated;
revoke all on function public.marketplace_set_enterprise_status(
  uuid, text, text, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.marketplace_actor_has_scope(
  text, text, text[], uuid, uuid, text[]
) to service_role;
grant execute on function public.marketplace_create_project(
  uuid, text, text, text, text, text, jsonb, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_update_project(
  uuid, jsonb, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_reorder_project_media(
  uuid, jsonb, text, text, text[], text
) to service_role;
grant execute on function public.marketplace_set_enterprise_status(
  uuid, text, text, text, text[], text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
