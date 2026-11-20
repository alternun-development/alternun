-- Enterprise applications submitted from the public Explorer "Add your company to Airs" form.
--
-- Mirrors project_proposals: the API stores them through one security-definer RPC that
-- validates, rate-limits (by HMAC'd IP and by email) and inserts; nothing is exposed to
-- anon/authenticated. The Alternun team reviews them before any enterprise is created.

begin;

create table public.enterprise_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  legal_name text,
  sector text not null,
  location text not null,
  website_url text,
  company_size text,
  offer text not null,
  interest text,
  contact_name text not null,
  contact_role text,
  contact_email text not null,
  contact_phone text,
  language text not null,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  constraint enterprise_applications_company_name_chk check (
    char_length(btrim(company_name)) between 2 and 160 and company_name !~ '[[:cntrl:]]'
  ),
  constraint enterprise_applications_legal_name_chk check (
    legal_name is null
    or (char_length(btrim(legal_name)) between 2 and 240 and legal_name !~ '[[:cntrl:]]')
  ),
  constraint enterprise_applications_sector_chk check (
    char_length(btrim(sector)) between 2 and 120 and sector !~ '[[:cntrl:]]'
  ),
  constraint enterprise_applications_location_chk check (
    char_length(btrim(location)) between 2 and 160 and location !~ '[[:cntrl:]]'
  ),
  constraint enterprise_applications_website_chk check (
    website_url is null
    or (char_length(website_url) <= 240 and website_url ~ '^https?://[^[:space:]]+$')
  ),
  constraint enterprise_applications_size_chk check (
    company_size is null or company_size in ('1-10', '11-50', '51-200', '201+')
  ),
  constraint enterprise_applications_offer_chk check (
    char_length(btrim(offer)) between 2 and 1000
    and pg_catalog.regexp_replace(offer, E'[\n\r\t]', '', 'g') !~ '[[:cntrl:]]'
  ),
  constraint enterprise_applications_interest_chk check (
    interest is null
    or (
      char_length(btrim(interest)) between 1 and 2000
      and pg_catalog.regexp_replace(interest, E'[\n\r\t]', '', 'g') !~ '[[:cntrl:]]'
    )
  ),
  constraint enterprise_applications_contact_name_chk check (
    char_length(btrim(contact_name)) between 2 and 120 and contact_name !~ '[[:cntrl:]]'
  ),
  constraint enterprise_applications_contact_role_chk check (
    contact_role is null
    or (char_length(btrim(contact_role)) between 2 and 120 and contact_role !~ '[[:cntrl:]]')
  ),
  constraint enterprise_applications_contact_email_chk check (
    char_length(contact_email) between 3 and 254
    and contact_email = lower(btrim(contact_email))
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint enterprise_applications_contact_phone_chk check (
    contact_phone is null or contact_phone ~ '^[0-9+()\s.-]{7,40}$'
  ),
  constraint enterprise_applications_language_chk check (language in ('es', 'en', 'th')),
  constraint enterprise_applications_status_chk check (
    status in ('new', 'reviewed', 'archived')
  )
);

create index enterprise_applications_contact_rate_idx
  on public.enterprise_applications (lower(contact_email), created_at desc);

create index enterprise_applications_status_created_idx
  on public.enterprise_applications (status, created_at desc);

create table public.enterprise_application_ip_submissions (
  application_id uuid primary key references public.enterprise_applications(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint enterprise_application_ip_submissions_hash_chk check (ip_hash ~ '^[0-9a-f]{64}$')
);

create index enterprise_application_ip_submissions_rate_idx
  on public.enterprise_application_ip_submissions (ip_hash, created_at desc);

create or replace function public.marketplace_submit_enterprise_application(
  p_application jsonb,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.enterprise_applications;
  v_email text := lower(btrim(coalesce(p_application ->> 'contactEmail', '')));
  v_ip_count integer := 0;
  v_email_count integer := 0;
begin
  if p_application is null
    or jsonb_typeof(p_application) <> 'object'
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or char_length(v_email) not between 3 and 254
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'ENTERPRISE_APPLICATION_INPUT_INVALID');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(concat_ws(':', 'enterprise-application-ip', p_ip_hash), 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(concat_ws(':', 'enterprise-application-email', v_email), 0)
  );

  select count(*) into v_ip_count
  from public.enterprise_application_ip_submissions submission
  where submission.ip_hash = p_ip_hash
    and submission.created_at >= timezone('utc', now()) - interval '1 hour';

  select count(*) into v_email_count
  from public.enterprise_applications application
  where lower(application.contact_email) = v_email
    and application.created_at >= timezone('utc', now()) - interval '1 day';

  if v_ip_count >= 5 or v_email_count >= 3 then
    return jsonb_build_object('ok', false, 'reasonCode', 'ENTERPRISE_APPLICATION_RATE_LIMITED');
  end if;

  begin
    insert into public.enterprise_applications (
      company_name, legal_name, sector, location, website_url, company_size, offer, interest,
      contact_name, contact_role, contact_email, contact_phone, language
    ) values (
      btrim(p_application ->> 'companyName'),
      nullif(btrim(coalesce(p_application ->> 'legalName', '')), ''),
      btrim(p_application ->> 'sector'),
      btrim(p_application ->> 'location'),
      nullif(btrim(coalesce(p_application ->> 'websiteUrl', '')), ''),
      nullif(btrim(coalesce(p_application ->> 'companySize', '')), ''),
      btrim(p_application ->> 'offer'),
      nullif(btrim(coalesce(p_application ->> 'interest', '')), ''),
      btrim(p_application ->> 'contactName'),
      nullif(btrim(coalesce(p_application ->> 'contactRole', '')), ''),
      v_email,
      nullif(btrim(coalesce(p_application ->> 'contactPhone', '')), ''),
      lower(btrim(coalesce(p_application ->> 'language', '')))
    ) returning * into v_application;
  exception
    when check_violation or not_null_violation then
      return jsonb_build_object('ok', false, 'reasonCode', 'ENTERPRISE_APPLICATION_INPUT_INVALID');
  end;

  insert into public.enterprise_application_ip_submissions (application_id, ip_hash)
  values (v_application.id, p_ip_hash);

  return jsonb_build_object('ok', true, 'application', to_jsonb(v_application));
end;
$$;

comment on table public.enterprise_applications is
  'Enterprise applications from the public Explorer form, reviewed by the Alternun team.';
comment on table public.enterprise_application_ip_submissions is
  'Server-only HMAC hashes used to rate-limit enterprise applications without storing raw IPs.';

alter table public.enterprise_applications enable row level security;
alter table public.enterprise_application_ip_submissions enable row level security;

revoke all on table public.enterprise_applications from public, anon, authenticated;
revoke all on table public.enterprise_application_ip_submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.enterprise_applications to service_role;
grant select, insert, delete on table public.enterprise_application_ip_submissions to service_role;

revoke all on function public.marketplace_submit_enterprise_application(jsonb, text)
  from public, anon, authenticated;
grant execute on function public.marketplace_submit_enterprise_application(jsonb, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
