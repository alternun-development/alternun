-- Read-only verification for 20261017_0001_harden_security_definer_functions.sql.
-- Run this script separately against development and production after applying
-- the migration.  It intentionally does not invoke reward or ledger writes.

with target_functions(signature) as (
  values
    ('public.airs_record_ledger_entry(uuid,text,numeric,text,text,text,numeric,numeric,text,jsonb)'),
    ('public.airs_award_registration_bonus(text,numeric)'),
    ('public.airs_award_profile_completion_bonus(text,numeric,text,jsonb)'),
    ('public.airs_update_user_profile(text,text,text,text)'),
    ('public.link_wallet_to_app_user(uuid,text,text)')
)
select
  target_functions.signature,
  procedure.prosecdef as security_definer,
  has_function_privilege('anon', target_functions.signature, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', target_functions.signature, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', target_functions.signature, 'EXECUTE') as service_role_can_execute,
  procedure.prosecdef
    and not has_function_privilege('anon', target_functions.signature, 'EXECUTE')
    and not has_function_privilege('authenticated', target_functions.signature, 'EXECUTE')
    and has_function_privilege('service_role', target_functions.signature, 'EXECUTE') as passes
from target_functions
join pg_catalog.pg_proc procedure
  on procedure.oid = to_regprocedure(target_functions.signature)
order by target_functions.signature;

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
    raise exception '% SECURITY DEFINER function(s) remain open', v_open_count;
  end if;
end;
$$;

select
  default_privileges.defaclrole::regrole as owner_role,
  default_privileges.defaclobjtype,
  default_privileges.defaclacl
from pg_catalog.pg_default_acl default_privileges
where default_privileges.defaclnamespace = 'public'::regnamespace
  and default_privileges.defaclobjtype = 'f'
order by default_privileges.defaclrole::regrole::text;
