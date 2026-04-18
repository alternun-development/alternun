-- Syncs Supabase auth.users to public.users
-- Called by: trg_auth_users_sync_to_app_users trigger
-- Maps: id, sub, iss, email, email_verified, name, picture

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Skip anonymous users
  if new.is_anonymous then
    return new;
  end if;

  insert into public.users (id, sub, iss, email, email_verified, name, picture)
  values (
    new.id,
    new.id::uuid,
    'supabase',
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        picture        = excluded.picture,
        updated_at     = timezone('utc', now());

  return new;
end;
$function$;
