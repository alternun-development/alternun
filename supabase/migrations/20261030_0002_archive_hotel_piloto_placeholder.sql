-- Issue #249 A4: fix pilot ownership.
--
-- 20261013_0001 seeded "Hotel Piloto" as a local placeholder to be replaced with
-- approved hotel data, which never arrived. 20261018_0001 made Alternun the
-- primary owner of eco-turismo, so Hotel Piloto has no project of its own.
-- This archives the placeholder through the audited status function. Nothing is
-- deleted: its non-primary relation to eco-turismo stays for the record.
-- Every step is guarded, so the migration is a no-op where the placeholder was
-- already archived, renamed or never seeded.

begin;

do $$
declare
  v_enterprise public.enterprises;
  v_result jsonb;
begin
  select enterprise.* into v_enterprise
  from public.enterprises enterprise
  where enterprise.id = '24900000-0000-4000-8000-000000000001'
    and enterprise.slug = 'hotel-piloto'
    and enterprise.created_by_subject = 'issue-249-seed';

  if not found or v_enterprise.status = 'archived' then
    return;
  end if;

  -- Only archive while it still owns no project as primary enterprise.
  if exists (
    select 1
    from public.enterprise_projects relation
    where relation.enterprise_id = v_enterprise.id
      and relation.is_primary
  ) then
    raise notice 'Hotel Piloto is the primary owner of a project; left unchanged.';
    return;
  end if;

  v_result := public.marketplace_set_enterprise_status(
    v_enterprise.id,
    'archived',
    'system',
    'migration-20261030-0002',
    array['platform_owner'],
    'migration-20261030-0002',
    'Pilot placeholder with no project of its own; eco-turismo is owned by Alternun.'
  );

  if coalesce(v_result ->> 'ok', 'false') <> 'true' then
    raise exception 'HOTEL_PILOTO_ARCHIVE_FAILED: %', v_result ->> 'reasonCode';
  end if;
end;
$$;

commit;
