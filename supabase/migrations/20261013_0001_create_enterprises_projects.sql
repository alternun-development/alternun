-- Issue #249 marketplace foundation: categories, enterprises, projects, media,
-- audit log, and the localized hotel pilot seed.
--
-- This migration intentionally exposes no table policy to anon/authenticated.
-- All public reads go through the API. The API currently uses Supabase
-- PostgREST for AIRS/domain RPCs, so service_role is the only data-plane role
-- granted access here.

begin;

create extension if not exists pgcrypto;

create table public.project_categories (
  code text primary key,
  labels jsonb not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint project_categories_code_chk check (code ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint project_categories_labels_chk check (jsonb_typeof(labels) = 'object')
);

create table public.enterprises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  legal_name text,
  status text not null default 'active',
  country_code text,
  website_url text,
  created_by_issuer text not null,
  created_by_subject text not null,
  updated_by_issuer text not null,
  updated_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint enterprises_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint enterprises_display_name_chk check (char_length(btrim(display_name)) between 1 and 160),
  constraint enterprises_legal_name_chk check (legal_name is null or char_length(btrim(legal_name)) between 1 and 240),
  constraint enterprises_status_chk check (status in ('active', 'paused', 'archived')),
  constraint enterprises_country_code_chk check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint enterprises_website_url_chk check (website_url is null or website_url ~ '^https://[^[:space:]]+$')
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null default 'draft',
  category_code text not null references public.project_categories(code),
  country_code text,
  time_zone text not null default 'UTC',
  default_locale text not null,
  content jsonb not null,
  first_published_at timestamptz,
  published_at timestamptz,
  created_by_issuer text not null,
  created_by_subject text not null,
  updated_by_issuer text not null,
  updated_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint projects_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint projects_status_chk check (status in ('draft', 'published', 'paused', 'archived')),
  constraint projects_country_code_chk check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint projects_default_locale_chk check (default_locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  constraint projects_content_chk check (
    jsonb_typeof(content) = 'object'
    and content ? default_locale
    and jsonb_typeof(content -> default_locale) = 'object'
  ),
  constraint projects_publication_timestamps_chk check (
    (status <> 'published' or (first_published_at is not null and published_at is not null))
    and (first_published_at is null or published_at is null or published_at >= first_published_at)
  )
);

create table public.enterprise_projects (
  enterprise_id uuid not null references public.enterprises(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  relation text not null,
  is_primary boolean not null default false,
  created_by_issuer text not null,
  created_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (enterprise_id, project_id),
  constraint enterprise_projects_relation_chk check (relation in ('owner', 'operator', 'sponsor', 'partner')),
  constraint enterprise_projects_primary_owner_chk check (not is_primary or relation = 'owner')
);

create unique index enterprise_projects_one_primary_uidx
  on public.enterprise_projects (project_id)
  where is_primary;

create table public.project_media_allowed_hosts (
  media_kind text not null,
  host text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (media_kind, host),
  constraint project_media_allowed_hosts_kind_chk check (
    media_kind in ('logo', 'cover', 'gallery_image', 'video', 'canva')
  ),
  constraint project_media_allowed_hosts_host_chk check (
    host = lower(host)
    and host ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    and host !~ '\.\.'
  )
);

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,
  url text not null,
  embed_url text,
  alt_text jsonb not null default '{}'::jsonb,
  caption jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by_issuer text not null,
  created_by_subject text not null,
  updated_by_issuer text not null,
  updated_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_media_kind_chk check (kind in ('logo', 'cover', 'gallery_image', 'video', 'canva')),
  constraint project_media_url_chk check (url ~ '^https://[^[:space:]]+$'),
  constraint project_media_embed_url_chk check (embed_url is null or embed_url ~ '^https://[^[:space:]]+$'),
  constraint project_media_alt_text_chk check (jsonb_typeof(alt_text) = 'object'),
  constraint project_media_caption_chk check (jsonb_typeof(caption) = 'object'),
  constraint project_media_sort_order_chk check (sort_order >= 0),
  constraint project_media_embed_kind_chk check (
    embed_url is null or kind in ('video', 'canva')
  )
);

create unique index project_media_singleton_kind_uidx
  on public.project_media (project_id, kind)
  where is_active and kind in ('logo', 'cover', 'video', 'canva');

create index project_media_project_order_idx
  on public.project_media (project_id, kind, sort_order, id);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_issuer text,
  actor_subject text,
  actor_roles text[] not null default '{}'::text[],
  action text not null,
  target_type text not null,
  target_id uuid,
  enterprise_id uuid references public.enterprises(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  request_id text,
  result text not null,
  reason_code text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_audit_log_result_chk check (result in ('allowed', 'denied')),
  constraint admin_audit_log_action_chk check (char_length(btrim(action)) between 1 and 160),
  constraint admin_audit_log_target_type_chk check (char_length(btrim(target_type)) between 1 and 80),
  constraint admin_audit_log_metadata_chk check (jsonb_typeof(metadata) = 'object')
);

create index admin_audit_log_occurred_at_idx
  on public.admin_audit_log (occurred_at desc);
create index admin_audit_log_enterprise_idx
  on public.admin_audit_log (enterprise_id, occurred_at desc);
create index admin_audit_log_project_idx
  on public.admin_audit_log (project_id, occurred_at desc);
create index admin_audit_log_actor_idx
  on public.admin_audit_log (actor_issuer, actor_subject, occurred_at desc);
create index admin_audit_log_action_result_idx
  on public.admin_audit_log (action, result, occurred_at desc);

create or replace function public.marketplace_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger enterprises_set_updated_at
before update on public.enterprises
for each row execute function public.marketplace_set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.marketplace_set_updated_at();

create trigger project_media_set_updated_at
before update on public.project_media
for each row execute function public.marketplace_set_updated_at();

create or replace function public.marketplace_validate_project_media()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_candidate text;
  v_host text;
  v_default_locale text;
begin
  foreach v_candidate in array array[new.url, new.embed_url]
  loop
    continue when v_candidate is null;

    if v_candidate !~ '^https://[^[:space:]]+$'
      or v_candidate ~ '^https://[^/]*@'
      or v_candidate ~ '^https://[^/]*:[0-9]+'
    then
      raise exception 'MEDIA_URL_INVALID' using errcode = '22023';
    end if;

    v_host := lower(substring(v_candidate from '^https://([^/:?#]+)'));
    if v_host is null or not exists (
      select 1
      from public.project_media_allowed_hosts h
      where h.media_kind = new.kind
        and h.host = v_host
    ) then
      raise exception 'MEDIA_HOST_NOT_ALLOWED' using errcode = '22023';
    end if;
  end loop;

  if new.kind in ('logo', 'cover', 'gallery_image') then
    select p.default_locale into v_default_locale
    from public.projects p
    where p.id = new.project_id;

    if v_default_locale is null
      or not (new.alt_text ? v_default_locale)
      or char_length(btrim(coalesce(new.alt_text ->> v_default_locale, ''))) = 0
    then
      raise exception 'MEDIA_ALT_REQUIRED' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger project_media_validate
before insert or update of kind, url, embed_url, alt_text, project_id
on public.project_media
for each row execute function public.marketplace_validate_project_media();

insert into public.project_categories (code, labels, sort_order)
values
  ('hospitality_ecotourism', '{"es":"Hospitalidad y ecoturismo","en":"Hospitality and ecotourism","th":"\u0e01\u0e32\u0e23\u0e15\u0e49\u0e2d\u0e19\u0e23\u0e31\u0e1a\u0e41\u0e25\u0e30\u0e01\u0e32\u0e23\u0e17\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e27\u0e40\u0e0a\u0e34\u0e07\u0e19\u0e34\u0e40\u0e27\u0e28"}'::jsonb, 10),
  ('conservation', '{"es":"Conservaci\u00f3n","en":"Conservation","th":"\u0e01\u0e32\u0e23\u0e2d\u0e19\u0e38\u0e23\u0e31\u0e01\u0e29\u0e4c"}'::jsonb, 20),
  ('productive_enterprise', '{"es":"Empresa productiva","en":"Productive enterprise","th":"\u0e27\u0e34\u0e2a\u0e32\u0e2b\u0e01\u0e34\u0e08\u0e01\u0e32\u0e23\u0e1c\u0e25\u0e34\u0e15"}'::jsonb, 30),
  ('regenerative_agriculture', '{"es":"Agricultura regenerativa","en":"Regenerative agriculture","th":"\u0e40\u0e01\u0e29\u0e15\u0e23\u0e1f\u0e37\u0e49\u0e19\u0e1f\u0e39"}'::jsonb, 40),
  ('community', '{"es":"Comunidad","en":"Community","th":"\u0e0a\u0e38\u0e21\u0e0a\u0e19"}'::jsonb, 50),
  ('education', '{"es":"Educaci\u00f3n","en":"Education","th":"\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32"}'::jsonb, 60),
  ('other', '{"es":"Otra","en":"Other","th":"\u0e2d\u0e37\u0e48\u0e19\u0e46"}'::jsonb, 999);

insert into public.project_media_allowed_hosts (media_kind, host)
values
  ('video', 'youtube.com'),
  ('video', 'www.youtube.com'),
  ('video', 'youtu.be'),
  ('video', 'youtube-nocookie.com'),
  ('video', 'www.youtube-nocookie.com'),
  ('video', 'vimeo.com'),
  ('video', 'www.vimeo.com'),
  ('video', 'player.vimeo.com'),
  ('canva', 'canva.com'),
  ('canva', 'www.canva.com');

-- Local pilot fixture. Edward must replace the placeholder enterprise identity
-- with approved hotel data before any production application.
insert into public.enterprises (
  id,
  slug,
  display_name,
  status,
  country_code,
  created_by_issuer,
  created_by_subject,
  updated_by_issuer,
  updated_by_subject
)
values (
  '24900000-0000-4000-8000-000000000001',
  'hotel-piloto',
  'Hotel Piloto',
  'active',
  'CO',
  'system',
  'issue-249-seed',
  'system',
  'issue-249-seed'
);

insert into public.projects (
  id,
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
)
values (
  '24900000-0000-4000-8000-000000000002',
  'eco-turismo',
  'draft',
  'hospitality_ecotourism',
  'CO',
  'America/Bogota',
  'es',
  '{
    "es": {
      "title": "Eco Turismo",
      "location": "Colombia",
      "theme": "Econom\u00eda viva y territorio",
      "description": "Un proyecto de turismo consciente para activar colaboraci\u00f3n, experiencias locales y valor regenerativo.",
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
      "title": "\u0e2d\u0e35\u0e42\u0e04\u0e17\u0e31\u0e27\u0e23\u0e34\u0e0b\u0e36\u0e21",
      "location": "\u0e42\u0e04\u0e25\u0e2d\u0e21\u0e40\u0e1a\u0e35\u0e22",
      "theme": "\u0e40\u0e28\u0e23\u0e29\u0e10\u0e01\u0e34\u0e08\u0e21\u0e35\u0e0a\u0e35\u0e27\u0e34\u0e15\u0e41\u0e25\u0e30\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48",
      "description": "\u0e42\u0e04\u0e23\u0e07\u0e01\u0e32\u0e23\u0e17\u0e48\u0e2d\u0e07\u0e40\u0e17\u0e35\u0e48\u0e22\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e21\u0e35\u0e2a\u0e15\u0e34\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e02\u0e31\u0e1a\u0e40\u0e04\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e04\u0e27\u0e32\u0e21\u0e23\u0e48\u0e27\u0e21\u0e21\u0e37\u0e2d \u0e1b\u0e23\u0e30\u0e2a\u0e1a\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e17\u0e49\u0e2d\u0e07\u0e16\u0e34\u0e48\u0e19 \u0e41\u0e25\u0e30\u0e04\u0e38\u0e13\u0e04\u0e48\u0e32\u0e40\u0e0a\u0e34\u0e07\u0e1f\u0e37\u0e49\u0e19\u0e1f\u0e39",
      "waysToContribute": ["\u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21", "\u0e40\u0e1c\u0e22\u0e41\u0e1e\u0e23\u0e48", "\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e1e\u0e31\u0e19\u0e18\u0e21\u0e34\u0e15\u0e23"]
    }
  }'::jsonb,
  'system',
  'issue-249-seed',
  'system',
  'issue-249-seed'
);

insert into public.enterprise_projects (
  enterprise_id,
  project_id,
  relation,
  is_primary,
  created_by_issuer,
  created_by_subject
)
values (
  '24900000-0000-4000-8000-000000000001',
  '24900000-0000-4000-8000-000000000002',
  'owner',
  true,
  'system',
  'issue-249-seed'
);

insert into public.project_media (
  id,
  project_id,
  kind,
  url,
  embed_url,
  alt_text,
  sort_order,
  created_by_issuer,
  created_by_subject,
  updated_by_issuer,
  updated_by_subject
)
values (
  '24900000-0000-4000-8000-000000000003',
  '24900000-0000-4000-8000-000000000002',
  'canva',
  'https://www.canva.com/design/DAHIGZY5d6Q/xOM9mNFn2qtqA8dd7WHrSQ/view',
  'https://www.canva.com/design/DAHIGZY5d6Q/xOM9mNFn2qtqA8dd7WHrSQ/view?embed',
  '{}'::jsonb,
  0,
  'system',
  'issue-249-seed',
  'system',
  'issue-249-seed'
);

alter table public.project_categories enable row level security;
alter table public.enterprises enable row level security;
alter table public.projects enable row level security;
alter table public.enterprise_projects enable row level security;
alter table public.project_media_allowed_hosts enable row level security;
alter table public.project_media enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on table public.project_categories from public, anon, authenticated;
revoke all on table public.enterprises from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.enterprise_projects from public, anon, authenticated;
revoke all on table public.project_media_allowed_hosts from public, anon, authenticated;
revoke all on table public.project_media from public, anon, authenticated;
revoke all on table public.admin_audit_log from public, anon, authenticated;

grant select, insert, update, delete on table public.project_categories to service_role;
grant select, insert, update, delete on table public.enterprises to service_role;
grant select, insert, update, delete on table public.projects to service_role;
grant select, insert, update, delete on table public.enterprise_projects to service_role;
grant select, insert, update, delete on table public.project_media_allowed_hosts to service_role;
grant select, insert, update, delete on table public.project_media to service_role;
grant select, insert on table public.admin_audit_log to service_role;

revoke all on function public.marketplace_set_updated_at() from public, anon, authenticated;
revoke all on function public.marketplace_validate_project_media() from public, anon, authenticated;
grant execute on function public.marketplace_set_updated_at() to service_role;
grant execute on function public.marketplace_validate_project_media() to service_role;

notify pgrst, 'reload schema';

commit;
