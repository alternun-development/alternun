-- Better Auth may omit public.users.id on create.
-- Fill id/sub/iss before the row hits NOT NULL/PK constraints so the insert
-- can succeed and still round-trip through the public -> auth mirror when the
-- generated id is UUID-shaped.

create extension if not exists pgcrypto;

create or replace function public.fill_public_users_better_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := coalesce(new.id, gen_random_uuid()::text);
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
