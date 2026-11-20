-- Launch catalog for production: only Fundación Batis (project) and Swing Golf Colombia
-- (enterprise) show on the public pages. Everything else is flagged testnet-only.
--
-- The API hides flagged rows only when APP_STAGE=production; testnet keeps showing every row,
-- and admin views are never filtered. Rows created after this migration default to visible.
-- To publish another project or enterprise in production, set its testnet_only to false.

begin;

alter table public.projects
  add column testnet_only boolean not null default false;

alter table public.enterprises
  add column testnet_only boolean not null default false;

update public.projects
set testnet_only = true
where slug <> 'fundacion-batis';

update public.enterprises
set testnet_only = true
where slug <> 'torneo-swing-golf-rincon-cajica';

commit;
