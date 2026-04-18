-- Drop existing Better Auth tables if they exist with incompatible schema
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "verifications" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Create Better Auth tables with UUID primary keys (compatible with Supabase auth)
CREATE TABLE "users" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE,
  email_verified boolean DEFAULT false,
  image text,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE TABLE "accounts" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamp WITH TIME ZONE,
  refresh_token_expires_at timestamp WITH TIME ZONE,
  scope text,
  id_token text,
  password text,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE TABLE "sessions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp WITH TIME ZONE NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE TABLE "verifications" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp WITH TIME ZONE NOT NULL,
  created_at timestamp WITH TIME ZONE,
  updated_at timestamp WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX "users_email_idx" ON "users" ("email");
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_token_idx" ON "sessions" ("token");
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");
