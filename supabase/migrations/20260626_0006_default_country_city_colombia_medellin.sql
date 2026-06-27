-- Set Colombia / Medellín as defaults for users who have not explicitly set a location.
-- Column defaults ensure new users also start with these values.

alter table public.users
  alter column country set default 'Colombia',
  alter column city    set default 'Medellín';

-- Backfill existing users that never picked a location.
-- Only set both columns together so a user who cleared one on purpose keeps their choice.
update public.users
set
  country = 'Colombia',
  city    = 'Medellín'
where country is null
  and city    is null;
