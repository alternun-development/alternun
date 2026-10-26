-- Verification for 20261026_0001_seed_project_image_media_hosts.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back.

begin;

do $$
declare
  v_project_id uuid;
  v_kind text;
  v_url text;
  v_expected text;
  v_error text;
  v_seeded integer;
begin
  select count(*) into v_seeded
  from public.project_media_allowed_hosts
  where host = 'images.unsplash.com'
    and media_kind in ('logo', 'cover', 'gallery_image');
  if v_seeded <> 3 then
    raise exception 'image hosts were not seeded for logo, cover and gallery_image: %', v_seeded;
  end if;

  insert into public.projects (
    slug, category_code, default_locale, content,
    created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
  ) values (
    'media-hosts-verification', 'other', 'en', '{"en":{"title":"Media hosts"}}'::jsonb,
    'verification', 'seed', 'verification', 'seed'
  ) returning id into v_project_id;

  foreach v_kind in array array['logo', 'cover', 'gallery_image']
  loop
    insert into public.project_media (
      project_id, kind, url, alt_text,
      created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
    ) values (
      v_project_id, v_kind, 'https://images.unsplash.com/photo-verification?w=1200',
      '{"en":"Verification image"}'::jsonb,
      'verification', 'seed', 'verification', 'seed'
    );

    for v_url, v_expected in
      select candidate.url, candidate.expected
      from (values
        ('https://not-listed.example.com/a.png', 'MEDIA_HOST_NOT_ALLOWED'),
        ('https://images.unsplash.com.evil.com/a.png', 'MEDIA_HOST_NOT_ALLOWED'),
        ('https://www.youtube.com/a.png', 'MEDIA_HOST_NOT_ALLOWED'),
        ('http://images.unsplash.com/a.png', 'MEDIA_URL_INVALID'),
        ('https://user@images.unsplash.com/a.png', 'MEDIA_URL_INVALID'),
        ('https://images.unsplash.com@evil.com/a.png', 'MEDIA_URL_INVALID'),
        ('https://images.unsplash.com:8443/a.png', 'MEDIA_URL_INVALID')
      ) as candidate(url, expected)
    loop
      v_error := null;
      begin
        insert into public.project_media (
          project_id, kind, url, alt_text, sort_order, is_active,
          created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject
        ) values (
          v_project_id, v_kind, v_url, '{"en":"Rejected image"}'::jsonb, 1, false,
          'verification', 'seed', 'verification', 'seed'
        );
      exception
        when sqlstate '22023' then v_error := sqlerrm;
      end;

      if v_error is distinct from v_expected then
        raise exception '% with % expected %, got %', v_kind, v_url, v_expected,
          coalesce(v_error, 'success');
      end if;
    end loop;
  end loop;

  if pg_catalog.has_table_privilege('anon', 'public.project_media_allowed_hosts', 'SELECT, INSERT, UPDATE, DELETE')
    or pg_catalog.has_table_privilege('authenticated', 'public.project_media_allowed_hosts', 'SELECT, INSERT, UPDATE, DELETE')
  then
    raise exception 'client roles must not access project_media_allowed_hosts';
  end if;
end;
$$;

set local role anon;

do $$
begin
  begin
    perform 1 from public.project_media_allowed_hosts limit 1;
    raise exception 'anon read of project_media_allowed_hosts unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;

do $$
begin
  begin
    insert into public.project_media_allowed_hosts (media_kind, host)
    values ('logo', 'attacker.example.com');
    raise exception 'authenticated insert into project_media_allowed_hosts unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
