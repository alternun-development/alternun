-- Run after applying 20261019_0001_create_project_proposals.sql.

begin;

do $$
begin
  if not pg_catalog.has_table_privilege('service_role', 'public.project_proposals', 'INSERT') then
    raise exception 'service_role must be able to insert project proposals';
  end if;

  if pg_catalog.has_table_privilege('anon', 'public.project_proposals', 'SELECT, INSERT')
    or pg_catalog.has_table_privilege('authenticated', 'public.project_proposals', 'SELECT, INSERT')
  then
    raise exception 'client roles must not access project proposals';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    'public.marketplace_submit_project_proposal(text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    'public.marketplace_submit_project_proposal(text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'client roles must not execute marketplace_submit_project_proposal';
  end if;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.marketplace_submit_project_proposal(text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role must execute marketplace_submit_project_proposal';
  end if;
end;
$$;

set local role service_role;

do $$
declare
  v_result jsonb;
begin
  v_result := public.marketplace_submit_project_proposal(
    'Bosque comunitario',
    'Andes, Colombia',
    'conservation',
    'Restauracion de bosque nativo.',
    'proposal-test@example.com',
    'Proposal Test',
    'es',
    repeat('a', 64)
  );

  if coalesce((v_result ->> 'ok')::boolean, false) is not true then
    raise exception 'valid proposal was rejected: %', v_result;
  end if;

  if not exists (
    select 1
    from public.project_proposals proposal
    where proposal.contact_email = 'proposal-test@example.com'
      and proposal.status = 'new'
  ) then
    raise exception 'valid proposal was not stored';
  end if;

  v_result := public.marketplace_submit_project_proposal(
    '',
    'Andes, Colombia',
    'invalid',
    null,
    'not-an-email',
    '',
    'xx',
    repeat('b', 64)
  );

  if v_result ->> 'reasonCode' <> 'PROJECT_PROPOSAL_INPUT_INVALID' then
    raise exception 'invalid proposal was not rejected: %', v_result;
  end if;

  -- 'a' already has one stored proposal: four more reach the 5-per-hour IP limit.
  for i in 1..4 loop
    v_result := public.marketplace_submit_project_proposal(
      'Bosque comunitario', 'Andes, Colombia', 'conservation', null,
      format('ip-limit-%s@example.com', i), 'Proposal Test', 'es', repeat('a', 64)
    );
    if coalesce((v_result ->> 'ok')::boolean, false) is not true then
      raise exception 'proposal % under the IP limit was rejected: %', i, v_result;
    end if;
  end loop;

  v_result := public.marketplace_submit_project_proposal(
    'Bosque comunitario', 'Andes, Colombia', 'conservation', null,
    'ip-limit-5@example.com', 'Proposal Test', 'es', repeat('a', 64)
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_PROPOSAL_RATE_LIMITED' then
    raise exception 'sixth proposal from one IP was not rate limited: %', v_result;
  end if;

  -- The email limit is 3 per day, across different IPs and letter case.
  for i in 1..3 loop
    v_result := public.marketplace_submit_project_proposal(
      'Bosque comunitario', 'Andes, Colombia', 'conservation', null,
      'Email-Limit@Example.com', 'Proposal Test', 'es', repeat(i::text, 64)
    );
  end loop;
  v_result := public.marketplace_submit_project_proposal(
    'Bosque comunitario', 'Andes, Colombia', 'conservation', null,
    'email-limit@example.com', 'Proposal Test', 'es', repeat('4', 64)
  );
  if v_result ->> 'reasonCode' is distinct from 'PROJECT_PROPOSAL_RATE_LIMITED' then
    raise exception 'fourth proposal from one email was not rate limited: %', v_result;
  end if;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    insert into public.project_proposals (
      project_name,
      location,
      category,
      contact_email,
      contact_name,
      language
    ) values (
      'Anon proposal',
      'Colombia',
      'productive',
      'anon@example.com',
      'Anonymous Test',
      'en'
    );
    raise exception 'anon insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
