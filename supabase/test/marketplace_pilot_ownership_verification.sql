-- Verification for 20261030_0002_archive_hotel_piloto_placeholder.
-- Run after all migrations on a disposable local database. Every assertion runs
-- inside a transaction that is always rolled back.

begin;

do $$
declare
  v_owner text;
  v_status text;
  v_audits integer;
  v_relations integer;
begin
  -- eco-turismo is owned by the Alternun enterprise.
  select enterprise.slug into v_owner
  from public.projects project
  join public.enterprise_projects relation
    on relation.project_id = project.id and relation.is_primary
  join public.enterprises enterprise on enterprise.id = relation.enterprise_id
  where project.slug = 'eco-turismo';
  if v_owner is distinct from 'alternun' then
    raise exception 'eco-turismo primary owner is %, expected alternun', v_owner;
  end if;

  -- Hotel Piloto is archived, through the audited status function.
  select status into v_status from public.enterprises where slug = 'hotel-piloto';
  if v_status is distinct from 'archived' then
    raise exception 'Hotel Piloto status is %, expected archived', v_status;
  end if;
  select count(*) into v_audits
  from public.admin_audit_log
  where request_id = 'migration-20261030-0002'
    and target_type = 'enterprise'
    and result = 'allowed';
  if v_audits < 1 then
    raise exception 'archiving Hotel Piloto was not audited';
  end if;

  -- Nothing was deleted: the enterprise and its old relation are still there.
  select count(*) into v_relations
  from public.enterprise_projects relation
  join public.enterprises enterprise on enterprise.id = relation.enterprise_id
  where enterprise.slug = 'hotel-piloto';
  if v_relations <> 1 then
    raise exception 'Hotel Piloto relations changed: %', v_relations;
  end if;

  -- It holds no primary project, and no active membership could reach eco-turismo.
  if exists (
    select 1 from public.enterprise_projects relation
    join public.enterprises enterprise on enterprise.id = relation.enterprise_id
    where enterprise.slug = 'hotel-piloto' and relation.is_primary
  ) then
    raise exception 'Hotel Piloto still owns a project as primary enterprise';
  end if;
  if exists (
    select 1 from public.project_memberships membership
    join public.enterprises enterprise on enterprise.id = membership.enterprise_id
    where enterprise.slug = 'hotel-piloto' and membership.status = 'active'
  ) then
    raise exception 'Hotel Piloto has active memberships';
  end if;
end;
$$;

rollback;
