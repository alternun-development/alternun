-- Prerequisite patch: production users table was provisioned before raw_claims
-- was added to the CREATE TABLE definition (20260319_0003). Add it idempotently
-- so that 20260321_0005 backfill can reference the column.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS raw_claims jsonb NOT NULL DEFAULT '{}'::jsonb;
