-- Mark migrations that cannot run against the production schema as applied so
-- the migration runner never attempts them again.
--
-- Why each is skipped:
--
--   20260321_0005  sync_auth_users_to_app_users
--     DDL (trigger + function) committed successfully; the ON CONFLICT (sub, iss)
--     backfill INSERT failed because the unique constraint was never created on the
--     production table (table pre-dated migration 0003). Triggers are live.
--
--   20260417_0011  better_auth_uuid_schema
--     DANGEROUS — contains DROP TABLE users CASCADE. Never apply to production.
--
--   20260418_0001  better_auth_schema
--     CREATE TABLE IF NOT EXISTS users with id TEXT — would conflict with production
--     UUID schema. No-op at runtime but misleading; skipped permanently.
--
--   20260418_0002  fix_user_id_type
--     DANGEROUS — contains DROP TABLE users CASCADE. Never apply to production.
--
--   20260422_0003  bidirectional_auth_user_sync
--     DDL (triggers) committed; backfill INSERT failed because Better Auth user IDs
--     are not UUIDs and cannot be cast to the production users.id uuid column.
--
--   20260422_0013  auth_users_source_of_truth
--     DDL (ALTER TABLE ADD COLUMN, DROP TRIGGER) committed; backfill INSERT failed
--     because it selects auth.users.id::text but ON CONFLICT (id) expects uuid.

INSERT INTO public._migrations (name, version)
VALUES
  ('sync_auth_users_to_app_users',           '20260321_0005'),
  ('better_auth_uuid_schema',                '20260417_0011'),
  ('better_auth_schema',                     '20260418_0001'),
  ('fix_user_id_type',                       '20260418_0002'),
  ('bidirectional_auth_user_sync',           '20260422_0003'),
  ('auth_users_source_of_truth',             '20260422_0013')
ON CONFLICT (version) DO NOTHING;
