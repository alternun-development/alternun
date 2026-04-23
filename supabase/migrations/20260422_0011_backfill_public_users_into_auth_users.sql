-- Backfill missing auth.users rows for Better Auth-created public.users records.
-- This is needed for rows that were created in public before the auth mirror
-- trigger was fully corrected.

insert into auth.users (
  id,
  email,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_anonymous
)
select
  p.id::uuid,
  p.email,
  case when p.email_verified then timezone('utc', now()) else null end,
  p.phone,
  case when p.phone_verified then timezone('utc', now()) else null end,
  p.confirmation_sent_at,
  p.last_sign_in_at,
  jsonb_build_object(
    'name', p.name,
    'full_name', p.name,
    'avatar_url', coalesce(p.picture, p.image),
    'picture', coalesce(p.picture, p.image),
    'email', p.email,
    'phone', p.phone
  ),
  jsonb_build_object(
    'aud', p.aud
  ),
  false
from public.users p
left join auth.users u on u.email = p.email
where u.id is null
  and p.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and p.email is not null
on conflict (id) do update
  set email             = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at,
      phone              = excluded.phone,
      phone_confirmed_at = excluded.phone_confirmed_at,
      confirmation_sent_at = excluded.confirmation_sent_at,
      last_sign_in_at    = excluded.last_sign_in_at,
      raw_user_meta_data = excluded.raw_user_meta_data,
      raw_app_meta_data  = excluded.raw_app_meta_data,
      updated_at         = timezone('utc', now());
