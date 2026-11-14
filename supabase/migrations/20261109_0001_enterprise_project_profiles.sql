-- Explorer mini-pages: enterprise and project profiles.
--
-- Adds what the mini-pages need (description, sector, location, public contact,
-- logo and banner, event details, sites, Airs per product) plus admin-only fields
-- (internal contacts, pending items, internal notes) that the public API never
-- returns. Also creates the public storage bucket used by admin image uploads.
-- Schema only: the testnet allies/projects data is loaded by
-- apps/api/scripts/seed-explorer-testnet.ts, which refuses to run on production.

begin;

alter table public.enterprises
  add column if not exists kind text not null default 'company',
  add column if not exists sector text,
  add column if not exists description text,
  add column if not exists partnership_status text not null default 'in_conversation',
  add column if not exists location jsonb not null default '{}'::jsonb,
  add column if not exists public_contact jsonb not null default '{}'::jsonb,
  add column if not exists logo_url text,
  add column if not exists banner_url text,
  add column if not exists event_details jsonb not null default '{}'::jsonb,
  add column if not exists sites jsonb not null default '[]'::jsonb,
  add column if not exists internal_contacts jsonb not null default '[]'::jsonb,
  add column if not exists pending_items text[] not null default '{}'::text[],
  add column if not exists internal_notes text;

alter table public.enterprises
  add constraint enterprises_kind_chk check (kind in ('company', 'event')),
  add constraint enterprises_sector_chk check (sector is null or char_length(btrim(sector)) between 1 and 160),
  add constraint enterprises_description_chk check (description is null or char_length(description) <= 4000),
  add constraint enterprises_partnership_status_chk check (
    partnership_status in ('structuring', 'in_conversation', 'onboarding', 'pilot', 'postponed', 'signed')
  ),
  add constraint enterprises_location_chk check (jsonb_typeof(location) = 'object'),
  add constraint enterprises_public_contact_chk check (jsonb_typeof(public_contact) = 'object'),
  add constraint enterprises_logo_url_chk check (logo_url is null or logo_url ~ '^https://[^[:space:]]+$'),
  add constraint enterprises_banner_url_chk check (banner_url is null or banner_url ~ '^https://[^[:space:]]+$'),
  add constraint enterprises_event_details_chk check (jsonb_typeof(event_details) = 'object'),
  add constraint enterprises_sites_chk check (jsonb_typeof(sites) = 'array'),
  add constraint enterprises_internal_contacts_chk check (jsonb_typeof(internal_contacts) = 'array'),
  add constraint enterprises_internal_notes_chk check (internal_notes is null or char_length(internal_notes) <= 4000);

comment on column public.enterprises.internal_contacts is 'Admin only. Never returned by public endpoints.';
comment on column public.enterprises.pending_items is 'Admin only. Never returned by public endpoints.';
comment on column public.enterprises.internal_notes is 'Admin only. Never returned by public endpoints.';

alter table public.projects
  add column if not exists alternate_name text,
  add column if not exists partnership_status text not null default 'structuring',
  add column if not exists location_details jsonb not null default '{}'::jsonb,
  add column if not exists public_contact jsonb not null default '{}'::jsonb,
  add column if not exists internal_contacts jsonb not null default '[]'::jsonb,
  add column if not exists pending_items text[] not null default '{}'::text[],
  add column if not exists internal_notes text;

alter table public.projects
  add constraint projects_alternate_name_chk check (
    alternate_name is null or char_length(btrim(alternate_name)) between 1 and 160
  ),
  add constraint projects_partnership_status_chk check (
    partnership_status in ('structuring', 'in_conversation', 'onboarding', 'pilot', 'postponed', 'signed')
  ),
  add constraint projects_location_details_chk check (jsonb_typeof(location_details) = 'object'),
  add constraint projects_public_contact_chk check (jsonb_typeof(public_contact) = 'object'),
  add constraint projects_internal_contacts_chk check (jsonb_typeof(internal_contacts) = 'array'),
  add constraint projects_internal_notes_chk check (internal_notes is null or char_length(internal_notes) <= 4000);

comment on column public.projects.internal_contacts is 'Admin only. Never returned by public endpoints.';
comment on column public.projects.pending_items is 'Admin only. Never returned by public endpoints.';
comment on column public.projects.internal_notes is 'Admin only. Never returned by public endpoints.';

-- What a person earns in Airs with each product or service of an enterprise.
-- Each enterprise sets its own scale; airs_note carries ranges or "to be defined".
create table public.enterprise_products (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  name text not null,
  description text,
  airs_min integer,
  airs_max integer,
  airs_note text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by_issuer text not null,
  created_by_subject text not null,
  updated_by_issuer text not null,
  updated_by_subject text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint enterprise_products_name_chk check (char_length(btrim(name)) between 1 and 160),
  constraint enterprise_products_description_chk check (description is null or char_length(description) <= 1000),
  constraint enterprise_products_airs_chk check (
    (airs_min is null or airs_min >= 0)
    and (airs_max is null or airs_max >= 0)
    and (airs_min is null or airs_max is null or airs_max >= airs_min)
  ),
  constraint enterprise_products_airs_note_chk check (airs_note is null or char_length(airs_note) <= 160),
  constraint enterprise_products_sort_order_chk check (sort_order >= 0)
);

create index enterprise_products_enterprise_order_idx
  on public.enterprise_products (enterprise_id, sort_order, id);

create trigger enterprise_products_set_updated_at
before update on public.enterprise_products
for each row execute function public.marketplace_set_updated_at();

alter table public.enterprise_products enable row level security;
revoke all on table public.enterprise_products from public, anon, authenticated;
grant select, insert, update, delete on table public.enterprise_products to service_role;

-- Admin image uploads. Writes go through API-issued signed upload URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-media',
  'marketplace-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

commit;
