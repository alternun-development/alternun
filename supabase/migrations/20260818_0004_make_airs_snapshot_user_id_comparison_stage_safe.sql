-- `public.users.id` is text in some deployed stages and UUID in others. The
-- snapshot RPC accepts a UUID, so normalize both sides to text when reading
-- the user row instead of relying on PostgreSQL to resolve uuid = text.

do $migration$
declare
  v_definition text;
  v_rewritten_definition text;
begin
  select pg_get_functiondef('public.airs_get_dashboard_snapshot(uuid, text, integer)'::regprocedure)
    into v_definition;

  if v_definition is null then
    raise exception 'AIRS snapshot RPC is missing';
  end if;

  v_rewritten_definition := replace(
    v_definition,
    'where id = p_user_id::text;',
    'where id::text = p_user_id::text;'
  );

  if v_rewritten_definition = v_definition then
    raise exception 'AIRS snapshot RPC does not contain the expected user-id predicate';
  end if;

  execute v_rewritten_definition;
end;
$migration$;

notify pgrst, 'reload schema';
