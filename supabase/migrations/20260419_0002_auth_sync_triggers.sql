-- Auth sync trigger functions and triggers
-- Source files (for editing):
--   Functions: supabase/functions/sync_auth_user_to_app_users.sql
--              supabase/functions/user_profiles_handle_auth_user_created.sql
--   Triggers:  supabase/triggers/auth_users_sync.sql
--   Docs:      docs/AUTH_SYNC_TRIGGERS.md

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_app_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.is_anonymous then
    return new;
  end if;
  insert into public.users (id, sub, iss, email, email_verified, name, picture)
  values (new.id, new.id::uuid, 'supabase', new.email, new.email_confirmed_at is not null, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email = excluded.email, email_verified = excluded.email_verified, name = excluded.name, picture = excluded.picture, updated_at = timezone('utc', now());
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.user_profiles_handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
begin
  insert into public.user_profiles (user_id, email, display_name, avatar_url, idp_provider, idp_subject, metadata)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)), new.raw_user_meta_data->>'avatar_url', coalesce(new.raw_app_meta_data->>'provider', 'supabase'), coalesce(new.raw_app_meta_data->>'provider_id', new.id::text), coalesce(new.raw_user_meta_data, '{}'::jsonb))
  on conflict (user_id) do update set email = excluded.email, display_name = excluded.display_name, avatar_url = excluded.avatar_url, idp_provider = excluded.idp_provider, idp_subject = excluded.idp_subject, metadata = excluded.metadata, updated_at = timezone('utc', now());
  return new;
end;
$function$;

CREATE TRIGGER trg_auth_users_sync_to_app_users AFTER INSERT OR UPDATE OF email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_app_users();

CREATE TRIGGER trg_auth_users_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION user_profiles_handle_auth_user_created();
