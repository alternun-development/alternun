-- Syncs Supabase auth.users to public.users
-- Called by: trg_auth_users_sync_to_app_users trigger
-- Maps: id, sub, iss, aud, email, email_verified, name, image, picture, phone, phone_verified, confirmation_sent_at, last_sign_in_at

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Skip anonymous users
  if new.is_anonymous then
    return new;
  end if;

  insert into public.users (
    id,
    sub,
    iss,
    aud,
    email,
    email_verified,
    name,
    image,
    picture,
    phone,
    phone_verified,
    confirmation_sent_at,
    last_sign_in_at
  )
  values (
    new.id::text,
    new.id::text,
    'better-auth',
    coalesce(new.raw_app_meta_data->>'aud', 'authenticated'),
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.phone,
    new.phone_confirmed_at is not null,
    new.confirmation_sent_at,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set sub            = excluded.sub,
        iss            = excluded.iss,
        aud            = excluded.aud,
        email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        image          = excluded.image,
        picture        = excluded.picture,
        phone          = excluded.phone,
        phone_verified = excluded.phone_verified,
        confirmation_sent_at = excluded.confirmation_sent_at,
        last_sign_in_at = excluded.last_sign_in_at,
        updated_at     = timezone('utc', now());

  return new;
end;
$function$;
