-- Issue #249 B2: every project has an owning Airs account.
--
-- The project account is a real Airs user that receives the project's rewards.
-- It is stored as text without a foreign key, like project_memberships.member_user_id,
-- because public.users.id differs between environments. No account address is
-- seeded here: operators link each project with apps/api/scripts/set-project-account.mjs.

begin;

alter table public.projects
  add column if not exists project_account_user_id text;

alter table public.projects
  drop constraint if exists projects_project_account_chk;

alter table public.projects
  add constraint projects_project_account_chk check (
    project_account_user_id is null
    or char_length(btrim(project_account_user_id)) between 1 and 64
  );

comment on column public.projects.project_account_user_id is
  'Airs user (public.users.id as text) that acts as the project identity and receives project rewards.';

create index if not exists projects_project_account_idx
  on public.projects (project_account_user_id)
  where project_account_user_id is not null;

-- Lists every project that still lacks an account or an active Project Admin.
-- A Project Admin counts when granted on the project or on its enterprise.
create or replace function public.marketplace_projects_missing_account_or_admin()
returns table (
  project_id uuid,
  slug text,
  missing_account boolean,
  missing_admin boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    project.id,
    project.slug,
    nullif(btrim(coalesce(project.project_account_user_id, '')), '') is null,
    not exists (
      select 1
      from public.project_memberships membership
      join public.enterprise_projects relation on relation.project_id = project.id
      where membership.status = 'active'
        and membership.role = 'partner_operator'
        and (
          (membership.scope_type = 'project' and membership.project_id = project.id)
          or (membership.scope_type = 'enterprise' and membership.enterprise_id = relation.enterprise_id)
        )
    )
  from public.projects project
  where project.status <> 'archived'
    and (
      nullif(btrim(coalesce(project.project_account_user_id, '')), '') is null
      or not exists (
        select 1
        from public.project_memberships membership
        join public.enterprise_projects relation on relation.project_id = project.id
        where membership.status = 'active'
          and membership.role = 'partner_operator'
          and (
            (membership.scope_type = 'project' and membership.project_id = project.id)
            or (membership.scope_type = 'enterprise' and membership.enterprise_id = relation.enterprise_id)
          )
      )
    )
  order by project.slug;
$$;

revoke all on function public.marketplace_projects_missing_account_or_admin()
  from public, anon, authenticated;
grant execute on function public.marketplace_projects_missing_account_or_admin()
  to service_role;

commit;
