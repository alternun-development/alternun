-- Confirmation updates trigger public.sync_auth_user_to_app_users(). In the
-- referral upsert, `confirmed_at` exists on both the target relation and the
-- EXCLUDED relation. Qualify the target column so Auth /verify cannot fail
-- with SQLSTATE 42702 after it has accepted a valid confirmation token.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.sync_auth_user_to_app_users()'::regprocedure)
  into function_definition;

  if position('confirmed_at = coalesce(confirmed_at, excluded.confirmed_at)' in function_definition) = 0 then
    raise exception
      'Expected the unqualified referral confirmation assignment in public.sync_auth_user_to_app_users()';
  end if;

  execute replace(
    function_definition,
    'confirmed_at = coalesce(confirmed_at, excluded.confirmed_at)',
    'confirmed_at = coalesce(public.referrals.confirmed_at, excluded.confirmed_at)'
  );
end;
$$;
