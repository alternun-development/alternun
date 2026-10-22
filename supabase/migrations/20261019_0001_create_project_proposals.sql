-- Public marketplace project proposals, stored through a service-role-only RPC.
-- Client roles have no table or function access.

begin;

create table public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  location text not null,
  category text not null,
  message text,
  contact_email text not null,
  contact_name text not null,
  language text not null,
  status text not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),
  constraint project_proposals_project_name_chk check (
    char_length(btrim(project_name)) between 2 and 160
    and project_name !~ '[[:cntrl:]]'
  ),
  constraint project_proposals_location_chk check (
    char_length(btrim(location)) between 2 and 160
    and location !~ '[[:cntrl:]]'
  ),
  constraint project_proposals_category_chk check (
    category in ('productive', 'conservation')
  ),
  constraint project_proposals_message_chk check (
    message is null
    or (
      char_length(btrim(message)) between 1 and 2000
      and pg_catalog.regexp_replace(message, E'[\n\r\t]', '', 'g') !~ '[[:cntrl:]]'
    )
  ),
  constraint project_proposals_contact_email_chk check (
    char_length(contact_email) between 3 and 254
    and contact_email = lower(btrim(contact_email))
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint project_proposals_contact_name_chk check (
    char_length(btrim(contact_name)) between 2 and 120
    and contact_name !~ '[[:cntrl:]]'
  ),
  constraint project_proposals_language_chk check (
    language in ('es', 'en', 'th')
  ),
  constraint project_proposals_status_chk check (
    status in ('new', 'reviewed', 'archived')
  )
);

create index project_proposals_contact_rate_idx
  on public.project_proposals (lower(contact_email), created_at desc);

create index project_proposals_status_created_idx
  on public.project_proposals (status, created_at desc);

create table public.project_proposal_ip_submissions (
  proposal_id uuid primary key references public.project_proposals(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint project_proposal_ip_submissions_hash_chk check (
    ip_hash ~ '^[0-9a-f]{64}$'
  )
);

create index project_proposal_ip_submissions_rate_idx
  on public.project_proposal_ip_submissions (ip_hash, created_at desc);

create or replace function public.marketplace_submit_project_proposal(
  p_project_name text,
  p_location text,
  p_category text,
  p_message text,
  p_contact_email text,
  p_contact_name text,
  p_language text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_proposal public.project_proposals;
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
  v_ip_count integer := 0;
  v_email_count integer := 0;
begin
  if p_project_name is null
    or char_length(btrim(p_project_name)) not between 2 and 160
    or p_project_name ~ '[[:cntrl:]]'
    or p_location is null
    or char_length(btrim(p_location)) not between 2 and 160
    or p_location ~ '[[:cntrl:]]'
    or p_category is null
    or p_category not in ('productive', 'conservation')
    or p_message is not null and (
      char_length(btrim(p_message)) not between 1 and 2000
      or pg_catalog.regexp_replace(p_message, E'[\n\r\t]', '', 'g') ~ '[[:cntrl:]]'
    )
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_contact_name is null
    or char_length(btrim(p_contact_name)) not between 2 and 120
    or p_contact_name ~ '[[:cntrl:]]'
    or p_language is null
    or lower(btrim(p_language)) not in ('es', 'en', 'th')
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_PROPOSAL_INPUT_INVALID');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(concat_ws(':', 'project-proposal-ip', p_ip_hash), 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(concat_ws(':', 'project-proposal-email', v_email), 0)
  );

  select count(*) into v_ip_count
  from public.project_proposal_ip_submissions submission
  where submission.ip_hash = p_ip_hash
    and submission.created_at >= timezone('utc', now()) - interval '1 hour';

  select count(*) into v_email_count
  from public.project_proposals proposal
  where lower(proposal.contact_email) = v_email
    and proposal.created_at >= timezone('utc', now()) - interval '1 day';

  if v_ip_count >= 5 or v_email_count >= 3 then
    return jsonb_build_object('ok', false, 'reasonCode', 'PROJECT_PROPOSAL_RATE_LIMITED');
  end if;

  insert into public.project_proposals (
    project_name,
    location,
    category,
    message,
    contact_email,
    contact_name,
    language
  ) values (
    btrim(p_project_name),
    btrim(p_location),
    p_category,
    nullif(btrim(coalesce(p_message, '')), ''),
    v_email,
    btrim(p_contact_name),
    lower(btrim(p_language))
  ) returning * into v_proposal;

  insert into public.project_proposal_ip_submissions (proposal_id, ip_hash)
  values (v_proposal.id, p_ip_hash);

  return jsonb_build_object(
    'ok', true,
    'proposal', to_jsonb(v_proposal)
  );
end;
$$;

comment on table public.project_proposals is
  'Project proposals submitted through the public Explorer form and reviewed internally.';

comment on table public.project_proposal_ip_submissions is
  'Server-only HMAC hashes used to enforce project proposal rate limits without storing raw IPs.';

comment on function public.marketplace_submit_project_proposal(
  text, text, text, text, text, text, text, text
) is 'Validates, rate-limits, and stores a public project proposal.';

alter table public.project_proposals enable row level security;
alter table public.project_proposal_ip_submissions enable row level security;

revoke all on table public.project_proposals from public, anon, authenticated;
revoke all on table public.project_proposal_ip_submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.project_proposals to service_role;
grant select, insert, delete on table public.project_proposal_ip_submissions to service_role;

revoke all on function public.marketplace_submit_project_proposal(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.marketplace_submit_project_proposal(
  text, text, text, text, text, text, text, text
) to service_role;

notify pgrst, 'reload schema';

commit;
