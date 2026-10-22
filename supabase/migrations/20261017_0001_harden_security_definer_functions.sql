-- Security hardening for privileged public functions.
--
-- The AIRS and marketplace APIs call these functions with the Supabase
-- service-role key.  SECURITY DEFINER functions must not be callable by
-- PostgREST's public roles: a caller can otherwise supply another user's id
-- and execute privileged writes under the function owner.

-- Prevent future functions created by the migration owner from receiving
-- PostgreSQL's default EXECUTE grant to PUBLIC (and therefore anon/authenticated).
-- Supabase's managed supabase_admin role is not a member of postgres, so its
-- default ACL cannot be altered from the postgres migration connection.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Revoke any historical or explicit grants from every SECURITY DEFINER
-- function in public.  The catalog lookup covers overloaded signatures and
-- functions introduced by migrations that predate this hardening pass.
do $$
declare
  v_signature text;
begin
  for v_signature in
    select format(
      '%I.%I(%s)',
      namespace.nspname,
      procedure.proname,
      pg_get_function_identity_arguments(procedure.oid)
    )
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_signature
    );
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end;
$$;

-- Fail the migration rather than silently leaving a privileged function open.
do $$
declare
  v_open_count bigint;
begin
  select count(*)
    into v_open_count
  from pg_catalog.pg_proc procedure
  join pg_catalog.pg_namespace namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.prosecdef
    and (
      has_function_privilege('anon', procedure.oid, 'EXECUTE')
      or has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    );

  if v_open_count > 0 then
    raise exception
      'Security hardening failed: % SECURITY DEFINER public function(s) remain callable by anon/authenticated',
      v_open_count;
  end if;
end;
$$;
