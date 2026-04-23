-- Better Auth generates text user ids, but auth.users.id is uuid.
-- Skip mirroring those rows back into auth.users so Better Auth sign-up can
-- complete without forcing an invalid cast.

create or replace function public.sync_public_user_to_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.id is null or new.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return new;
  end if;

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
  values (
    new.id::uuid,
    new.email,
    case when new.email_verified then timezone('utc', now()) else null end,
    new.phone,
    case when new.phone_verified then timezone('utc', now()) else null end,
    new.confirmation_sent_at,
    new.last_sign_in_at,
    jsonb_build_object(
      'name', new.name,
      'full_name', new.name,
      'avatar_url', coalesce(new.picture, new.image),
      'picture', coalesce(new.picture, new.image),
      'email', new.email,
      'phone', new.phone
    ),
    jsonb_build_object(
      'aud', new.aud
    ),
    false
  )
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

  return new;
end;
$$;
