-- Ensure Better Auth inserts can satisfy the public.users identity columns.
-- The Better Auth adapter does not populate sub/iss directly, so we fill them
-- here before the row-level NOT NULL constraints run.

create or replace function public.fill_public_users_better_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.sub := coalesce(new.sub, new.id);
  new.iss := coalesce(new.iss, 'better-auth');
  return new;
end;
$$;

drop trigger if exists trg_public_users_fill_better_auth_identity on public.users;
create trigger trg_public_users_fill_better_auth_identity
before insert or update of id, sub, iss
on public.users
for each row
execute function public.fill_public_users_better_auth_identity();

