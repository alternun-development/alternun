-- Alternun global admins as seen by the Airs app.
--
-- The admin panel and the admin API keep authorizing with Authentik groups. This table only
-- tells the app (GET /v1/me/admin-access) which signed-in people are Alternun global admins,
-- so it can show them the admin entry points. Matching is by verified email.

begin;

create table if not exists public.platform_admins (
  email text primary key,
  role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint platform_admins_email_chk check (email = lower(btrim(email)) and email like '%_@_%'),
  constraint platform_admins_role_chk check (role in ('platform_owner', 'internal_admin'))
);

drop trigger if exists platform_admins_set_updated_at on public.platform_admins;
create trigger platform_admins_set_updated_at
before update on public.platform_admins
for each row execute function public.marketplace_set_updated_at();

alter table public.platform_admins enable row level security;
revoke all on table public.platform_admins from public, anon, authenticated;
grant select, insert, update, delete on table public.platform_admins to service_role;

insert into public.platform_admins (email, role)
values
  ('edward@alternun.io', 'platform_owner'),
  ('sgomez@alternun.io', 'platform_owner')
on conflict (email) do update set role = excluded.role, is_active = true;

notify pgrst, 'reload schema';

commit;
