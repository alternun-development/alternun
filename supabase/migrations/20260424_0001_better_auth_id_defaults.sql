-- Ensure Better Auth tables can accept inserts that rely on database-generated ids.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "users"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "accounts"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "sessions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "verifications"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
