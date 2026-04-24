-- Better Auth stores request metadata on session creation.
-- Older local/dev databases were created before these columns existed.

create extension if not exists pgcrypto;

alter table public.sessions
  add column if not exists ip_address text,
  add column if not exists user_agent text;

alter table public.sessions
  alter column id set default gen_random_uuid()::text;
