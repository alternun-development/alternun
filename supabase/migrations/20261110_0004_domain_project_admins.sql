-- Project admins by email domain (not global admins).
--
-- Everyone with a verified email of a listed domain gets, per active enterprise, an
-- enterprise-wide membership: `home_role` on the domain's own enterprises (for alternun.io,
-- partner_operator on the `alternun` enterprise: edit any Alternun project) and `partner_role`
-- on every other enterprise (project_moderator: moderate third-party projects).
--
-- The memberships are ordinary rows, so every scope check, permission and audit applies as
-- for a membership granted by hand. The API calls the sync when the person opens the app;
-- it only adds what is missing and never re-creates a membership someone revoked.

begin;

create table public.platform_admin_domains (
  domain text primary key,
  home_enterprise_slugs text[] not null,
  home_role text not null default 'partner_operator',
  partner_role text not null default 'project_moderator',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint platform_admin_domains_domain_chk check (
    domain = lower(btrim(domain)) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
  ),
  constraint platform_admin_domains_roles_chk check (
    home_role in ('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator')
    and partner_role in ('partner_operator', 'sub_admin', 'partner_readonly', 'project_moderator')
  )
);

create trigger platform_admin_domains_set_updated_at
before update on public.platform_admin_domains
for each row execute function public.marketplace_set_updated_at();

comment on table public.platform_admin_domains is
  'Email domains whose verified users are project admins of their own enterprises and moderators elsewhere.';

alter table public.platform_admin_domains enable row level security;
revoke all on table public.platform_admin_domains from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_admin_domains to service_role;

insert into public.platform_admin_domains (domain, home_enterprise_slugs, home_role, partner_role)
values ('alternun.io', array['alternun'], 'partner_operator', 'project_moderator')
on conflict (domain) do update
set home_enterprise_slugs = excluded.home_enterprise_slugs,
    home_role = excluded.home_role,
    partner_role = excluded.partner_role,
    is_active = true;

-- p_member_issuer is the issuer the API stores on memberships it grants (the console's).
create or replace function public.marketplace_sync_domain_memberships(
  p_user_id text,
  p_member_issuer text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user public.users;
  v_email text;
  v_rule public.platform_admin_domains;
  v_subject text;
  v_grantor text;
  v_enterprise public.enterprises;
  v_role text;
  v_membership public.project_memberships;
  v_granted integer := 0;
begin
  if nullif(btrim(coalesce(p_user_id, '')), '') is null
    or nullif(btrim(coalesce(p_member_issuer, '')), '') is null
  then
    return jsonb_build_object('ok', false, 'reasonCode', 'MEMBERSHIP_INPUT_INVALID');
  end if;

  select * into v_user
  from public.users app_user
  where app_user.id::text = btrim(p_user_id) and app_user.email_verified = true;
  v_email := lower(btrim(coalesce(v_user.email, '')));
  if v_user.id is null or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', true, 'granted', 0);
  end if;

  select * into v_rule
  from public.platform_admin_domains rule
  where rule.domain = split_part(v_email, '@', 2) and rule.is_active;
  -- Global admins already reach everything.
  if v_rule.domain is null or exists (
    select 1 from public.platform_admins admin
    where admin.email = v_email and admin.is_active
  ) then
    return jsonb_build_object('ok', true, 'granted', 0);
  end if;

  -- Same subject the API uses for memberships granted by email.
  v_subject := coalesce(
    nullif(btrim(v_user.raw_claims ->> 'uuid'), ''),
    nullif(btrim(v_user.raw_claims ->> 'sub'), ''),
    nullif(btrim(v_user.sub), '')
  );
  if v_subject is null then
    return jsonb_build_object('ok', false, 'reasonCode', 'MEMBERSHIP_INPUT_INVALID');
  end if;
  v_grantor := 'domain:' || v_rule.domain;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('domain-memberships:' || v_user.id::text, 0)
  );

  for v_enterprise in
    select * from public.enterprises enterprise
    where enterprise.status <> 'archived'
    order by enterprise.slug
  loop
    v_role := case
      when v_enterprise.slug = any(v_rule.home_enterprise_slugs) then v_rule.home_role
      else v_rule.partner_role
    end;

    -- Skip when the person already holds that role there, or when a domain grant for this
    -- enterprise exists in any state (a revoked one stays revoked).
    continue when exists (
      select 1 from public.project_memberships membership
      where membership.member_user_id = v_user.id::text
        and membership.enterprise_id = v_enterprise.id
        and membership.scope_type = 'enterprise'
        and (
          (membership.status = 'active' and membership.role = v_role)
          or membership.granted_by_subject = v_grantor
        )
    );

    begin
      insert into public.project_memberships (
        member_issuer, member_subject, member_user_id, enterprise_id, project_id,
        scope_type, role, granted_by_issuer, granted_by_subject
      ) values (
        btrim(p_member_issuer), v_subject, v_user.id::text, v_enterprise.id, null,
        'enterprise', v_role, 'system', v_grantor
      ) returning * into v_membership;
    exception
      when unique_violation then
        continue;
    end;

    insert into public.admin_audit_log (
      actor_issuer, actor_subject, actor_roles, action, target_type, target_id,
      enterprise_id, request_id, result, after_state
    ) values (
      'system', v_grantor, '{}'::text[], 'membership.domain_granted', 'project_membership',
      v_membership.id, v_enterprise.id, 'domain-sync:' || v_user.id::text, 'allowed',
      to_jsonb(v_membership)
    );
    v_granted := v_granted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'granted', v_granted);
end;
$$;

revoke all on function public.marketplace_sync_domain_memberships(text, text)
  from public, anon, authenticated;
grant execute on function public.marketplace_sync_domain_memberships(text, text) to service_role;

notify pgrst, 'reload schema';

commit;
