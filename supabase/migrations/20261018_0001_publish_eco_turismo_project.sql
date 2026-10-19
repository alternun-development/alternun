-- Restore the original Eco Turismo content and publish it as marketplace project 1.

begin;

do $$
declare
  v_actor_issuer constant text := 'system';
  v_actor_subject constant text := 'migration-20261018-0001';
  v_actor_roles constant text[] := array['platform_owner'];
  v_canva_url constant text := 'https://www.canva.com/design/DAHIGZY5d6Q/xOM9mNFn2qtqA8dd7WHrSQ/view?embed';
  v_content constant jsonb := '{
    "es": {
      "title": "Eco Turismo",
      "location": "Colombia",
      "theme": "Economía viva y territorio",
      "description": "Un proyecto de turismo consciente para activar colaboración, experiencias locales y valor regenerativo.",
      "waysToContribute": ["Participar", "Difundir", "Conectar aliados"]
    },
    "en": {
      "title": "Eco Tourism",
      "location": "Colombia",
      "theme": "Living economy and territory",
      "description": "A conscious tourism project that activates collaboration, local experiences, and regenerative value.",
      "waysToContribute": ["Participate", "Share", "Connect allies"]
    },
    "th": {
      "title": "อีโคทัวริซึม",
      "location": "โคลอมเบีย",
      "theme": "เศรษฐกิจมีชีวิตและพื้นที่",
      "description": "โครงการท่องเที่ยวอย่างมีสติเพื่อขับเคลื่อนความร่วมมือ ประสบการณ์ท้องถิ่น และคุณค่าเชิงฟื้นฟู",
      "waysToContribute": ["เข้าร่วม", "เผยแพร่", "เชื่อมต่อพันธมิตร"]
    }
  }'::jsonb;
  v_alt_text constant jsonb := '{
    "es": "Presentación del proyecto Eco Turismo",
    "en": "Eco Tourism project presentation",
    "th": "งานนำเสนอโครงการอีโคทัวริซึม"
  }'::jsonb;
  v_caption constant jsonb := '{
    "es": "Presentación de Eco Turismo",
    "en": "Eco Tourism presentation",
    "th": "การนำเสนออีโคทัวริซึม"
  }'::jsonb;
  v_project public.projects;
  v_alternun_id uuid;
  v_media_id uuid;
  v_result jsonb;
  v_before_direct jsonb;
  v_after_direct jsonb;
  v_direct_changed boolean := false;
  v_row_count integer;
begin
  select project.* into v_project
  from public.projects project
  where project.slug = 'eco-turismo'
  for update;

  if not found then
    raise exception 'ECO_TURISMO_PROJECT_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'primaryEnterpriseId', (
      select relation.enterprise_id
      from public.enterprise_projects relation
      where relation.project_id = v_project.id
        and relation.is_primary
    ),
    'canvaMedia', (
      select to_jsonb(media)
      from public.project_media media
      where media.project_id = v_project.id
        and media.kind = 'canva'
      order by media.is_active desc, media.created_at, media.id
      limit 1
    )
  ) into v_before_direct;

  insert into public.project_media_allowed_hosts (media_kind, host)
  values
    ('canva', 'canva.com'),
    ('canva', 'www.canva.com')
  on conflict (media_kind, host) do nothing;

  get diagnostics v_row_count = row_count;
  v_direct_changed := v_direct_changed or v_row_count > 0;

  -- Empresa propietaria por defecto: Alternun, pendiente de confirmacion del revisor
  insert into public.enterprises (
    slug,
    display_name,
    status,
    created_by_issuer,
    created_by_subject,
    updated_by_issuer,
    updated_by_subject
  ) values (
    'alternun',
    'Alternun',
    'active',
    v_actor_issuer,
    v_actor_subject,
    v_actor_issuer,
    v_actor_subject
  )
  on conflict (slug) do update
  set display_name = excluded.display_name,
      status = excluded.status,
      updated_by_issuer = excluded.updated_by_issuer,
      updated_by_subject = excluded.updated_by_subject
  where (public.enterprises.display_name, public.enterprises.status)
    is distinct from (excluded.display_name, excluded.status)
  returning id into v_alternun_id;

  if v_alternun_id is null then
    select enterprise.id into strict v_alternun_id
    from public.enterprises enterprise
    where enterprise.slug = 'alternun';
  else
    v_direct_changed := true;
  end if;

  update public.enterprise_projects relation
  set is_primary = false
  where relation.project_id = v_project.id
    and relation.is_primary
    and relation.enterprise_id <> v_alternun_id;

  get diagnostics v_row_count = row_count;
  v_direct_changed := v_direct_changed or v_row_count > 0;

  insert into public.enterprise_projects (
    enterprise_id,
    project_id,
    relation,
    is_primary,
    created_by_issuer,
    created_by_subject
  ) values (
    v_alternun_id,
    v_project.id,
    'owner',
    true,
    v_actor_issuer,
    v_actor_subject
  )
  on conflict (enterprise_id, project_id) do update
  set relation = excluded.relation,
      is_primary = excluded.is_primary
  where (public.enterprise_projects.relation, public.enterprise_projects.is_primary)
    is distinct from (excluded.relation, excluded.is_primary);

  get diagnostics v_row_count = row_count;
  v_direct_changed := v_direct_changed or v_row_count > 0;

  if (v_project.category_code, v_project.country_code, v_project.time_zone,
      v_project.default_locale, v_project.content)
    is distinct from ('productive_enterprise', 'CO', 'America/Bogota', 'es', v_content)
  then
    v_result := public.marketplace_update_project(
      v_project.id,
      jsonb_build_object(
        'categoryCode', 'productive_enterprise',
        'countryCode', 'CO',
        'timeZone', 'America/Bogota',
        'defaultLocale', 'es',
        'content', v_content
      ),
      v_actor_issuer,
      v_actor_subject,
      v_actor_roles,
      'migration-20261018-0001-content'
    );

    if coalesce((v_result ->> 'ok')::boolean, false) is not true then
      raise exception 'ECO_TURISMO_CONTENT_UPDATE_FAILED: %', v_result ->> 'reasonCode';
    end if;
  end if;

  select media.id into v_media_id
  from public.project_media media
  where media.project_id = v_project.id
    and media.kind = 'canva'
  order by media.is_active desc, media.created_at, media.id
  limit 1
  for update;

  if v_media_id is null then
    insert into public.project_media (
      project_id,
      kind,
      url,
      embed_url,
      alt_text,
      caption,
      sort_order,
      is_active,
      created_by_issuer,
      created_by_subject,
      updated_by_issuer,
      updated_by_subject
    ) values (
      v_project.id,
      'canva',
      v_canva_url,
      v_canva_url,
      v_alt_text,
      v_caption,
      0,
      true,
      v_actor_issuer,
      v_actor_subject,
      v_actor_issuer,
      v_actor_subject
    )
    returning id into v_media_id;

    v_direct_changed := true;
  else
    update public.project_media media
    set url = v_canva_url,
        embed_url = v_canva_url,
        alt_text = v_alt_text,
        caption = v_caption,
        sort_order = 0,
        is_active = true,
        updated_by_issuer = v_actor_issuer,
        updated_by_subject = v_actor_subject
    where media.id = v_media_id
      and (media.url, media.embed_url, media.alt_text, media.caption,
           media.sort_order, media.is_active)
        is distinct from (v_canva_url, v_canva_url, v_alt_text, v_caption, 0, true);

    get diagnostics v_row_count = row_count;
    v_direct_changed := v_direct_changed or v_row_count > 0;
  end if;

  if v_direct_changed or not exists (
    select 1
    from public.admin_audit_log audit
    where audit.project_id = v_project.id
      and audit.request_id = 'migration-20261018-0001-configuration'
  ) then
    select jsonb_build_object(
      'primaryEnterpriseId', (
        select relation.enterprise_id
        from public.enterprise_projects relation
        where relation.project_id = v_project.id
          and relation.is_primary
      ),
      'canvaMedia', (
        select to_jsonb(media)
        from public.project_media media
        where media.id = v_media_id
      )
    ) into v_after_direct;

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
      v_actor_issuer,
      v_actor_subject,
      v_actor_roles,
      'project.marketplace_project_1_configured',
      'project',
      v_project.id,
      v_alternun_id,
      v_project.id,
      'migration-20261018-0001-configuration',
      'allowed',
      v_before_direct,
      v_after_direct,
      jsonb_build_object(
        'slug', 'eco-turismo',
        'changed', v_direct_changed
      )
    );
  end if;

  v_result := public.marketplace_transition_project_status(
    v_project.id,
    'published',
    v_actor_issuer,
    v_actor_subject,
    v_actor_roles,
    'migration-20261018-0001-publish',
    null
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'ECO_TURISMO_PUBLISH_FAILED: %', v_result ->> 'reasonCode';
  end if;
end;
$$;

commit;
