-- Creates user_profiles entry when auth.users is created
-- Called by: trg_auth_users_create_profile trigger
-- Maps: user_id, email, display_name, avatar_url, idp_provider, idp_subject, metadata

CREATE OR REPLACE FUNCTION public.user_profiles_handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
begin
  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    avatar_url,
    idp_provider,
    idp_subject,
    metadata
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'supabase'),
    coalesce(new.raw_app_meta_data->>'provider_id', new.id::text),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (user_id)
  do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        idp_provider = excluded.idp_provider,
        idp_subject = excluded.idp_subject,
        metadata = excluded.metadata,
        updated_at = timezone('utc', now());

  return new;
end;
$function$;
