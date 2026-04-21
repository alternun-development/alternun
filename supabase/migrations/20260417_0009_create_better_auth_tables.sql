-- Create Better Auth users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text,
  "email" text UNIQUE,
  "email_verified" boolean DEFAULT false,
  "image" text,
  "created_at" timestamp WITH TIME ZONE DEFAULT now(),
  "updated_at" timestamp WITH TIME ZONE DEFAULT now()
);

-- Create Better Auth accounts table
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" text NOT NULL PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "access_token_expires_at" timestamp WITH TIME ZONE,
  "refresh_token_expires_at" timestamp WITH TIME ZONE,
  "scope" text,
  "id_token" text,
  "password" text,
  "created_at" timestamp WITH TIME ZONE DEFAULT now(),
  "updated_at" timestamp WITH TIME ZONE DEFAULT now()
);

-- Create Better Auth sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text NOT NULL PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp WITH TIME ZONE NOT NULL,
  "created_at" timestamp WITH TIME ZONE DEFAULT now(),
  "updated_at" timestamp WITH TIME ZONE DEFAULT now()
);

-- Create Better Auth verifications table
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp WITH TIME ZONE NOT NULL,
  "created_at" timestamp WITH TIME ZONE,
  "updated_at" timestamp WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications"("identifier");
