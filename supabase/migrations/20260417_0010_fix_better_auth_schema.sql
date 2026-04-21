-- Drop incompatible foreign keys first
ALTER TABLE "accounts"
  DROP CONSTRAINT IF EXISTS "accounts_user_id_fkey";

ALTER TABLE "sessions"
  DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";

-- Recreate foreign keys with explicit action
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON DELETE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON DELETE CASCADE;
