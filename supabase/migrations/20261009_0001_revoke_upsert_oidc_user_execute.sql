-- The OIDC upsert helper is a backend provisioning function. Client roles must
-- not be able to invoke its SECURITY DEFINER privileges with the public key.
-- Keep this migration safe for environments that never received the helper.
do $$
declare
  function_signature regprocedure := to_regprocedure(
    'public.upsert_oidc_user(text, text, text, boolean, text, text, text, jsonb)'
  );
begin
  if function_signature is null then
    return;
  end if;

  execute format('revoke all on function %s from public', function_signature);
  execute format('revoke all on function %s from anon', function_signature);
  execute format('revoke all on function %s from authenticated', function_signature);
  execute format('grant execute on function %s to service_role', function_signature);
end
$$;
