-- Restore Better Auth identity columns on public.users.
-- The dev database drifted onto an older public.users shape that lacked sub/iss,
-- which breaks Better Auth sign-up queries and prevents verification mail from
-- being sent on first registration.

alter table public.users
  add column if not exists sub text,
  add column if not exists iss text;

update public.users
set
  sub = coalesce(sub, id),
  iss = coalesce(iss, 'better-auth')
where sub is null or iss is null;

alter table public.users
  alter column sub set not null,
  alter column iss set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_sub_iss_uq'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_sub_iss_uq unique (sub, iss);
  end if;
end;
$$;

