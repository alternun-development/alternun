-- Mirror deletions from public.users back into auth.users for UUID-backed rows.

create or replace function public.delete_public_user_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  if old.id is null or old.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return old;
  end if;

  delete from auth.users
  where id = old.id::uuid;

  return old;
end;
$$;

drop trigger if exists trg_public_users_delete_sync_to_auth_users on public.users;
create trigger trg_public_users_delete_sync_to_auth_users
after delete
on public.users
for each row
execute function public.delete_public_user_auth_user();
