-- Triggers for syncing auth.users to application tables
-- These fire when users sign up or update their profile in Supabase auth

-- Sync auth.users to public.users on INSERT/UPDATE
-- Fires after: INSERT or UPDATE of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
DROP TRIGGER IF EXISTS trg_auth_users_sync_to_app_users ON auth.users;
CREATE TRIGGER trg_auth_users_sync_to_app_users
  AFTER INSERT OR UPDATE OF email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_app_users();

-- Create user profile when auth user is created
-- Fires after: INSERT
DROP TRIGGER IF EXISTS trg_auth_users_create_profile ON auth.users;
CREATE TRIGGER trg_auth_users_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION user_profiles_handle_auth_user_created();
