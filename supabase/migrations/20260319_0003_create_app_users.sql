-- Vendor-independent user registry.
-- Intentionally NOT linked to auth.users so the app can migrate away from
-- Supabase Auth without losing user data. IDs are our own UUIDs.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id              uuid        primary key default gen_random_uuid(),
  -- OIDC subject claim from Authentik (e.g. "abc123")
  sub             text        not null,
  -- Issuer URL from the OIDC provider (e.g. "https://testnet.sso.alternun.co/application/o/mobile/")
  iss             text        not null,
  email           text,
  email_verified  boolean     not null default false,
  name            text,
  picture         text,
  -- Which social provider Authentik brokered (google, discord, …)
  provider        text,
  raw_claims      jsonb       not null default '{}'::jsonb,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  constraint users_sub_iss_uq unique (sub, iss),
  constraint users_sub_len_chk   check (char_length(sub) <= 256),
  constraint users_iss_len_chk   check (char_length(iss) <= 512),
  constraint users_email_len_chk check (email is null or char_length(email) <= 320)
);

create index if not exists users_email_idx on public.users (email) where email is not null;
create index if not exists users_provider_idx on public.users (provider) where provider is not null;

-- Auto-bump updated_at
create or replace function public.users_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.users_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- upsert_oidc_user
-- Called from the mobile client with the anon key after a successful OIDC login.
-- SECURITY DEFINER so the anon role can write to public.users without RLS bypass
-- needing service-role credentials on the client.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.upsert_oidc_user(
  p_sub           text,
  p_iss           text,
  p_email         text         default null,
  p_email_verified boolean     default false,
  p_name          text         default null,
  p_picture       text         default null,
  p_provider      text         default null,
  p_raw_claims    jsonb        default '{}'::jsonb
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  insert into public.users (sub, iss, email, email_verified, name, picture, provider, raw_claims)
  values (p_sub, p_iss, p_email, p_email_verified, p_name, p_picture, p_provider, p_raw_claims)
  on conflict (sub, iss) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        picture        = excluded.picture,
        provider       = excluded.provider,
        raw_claims     = excluded.raw_claims,
        updated_at     = timezone('utc', now())
  returning * into v_user;

  return v_user;
end;
$$;

-- Row-level security: users can only read their own row once we have a session
-- mechanism. For now the table is write-only via the definer function; reads are
-- blocked for anon until a proper session strategy is decided.
alter table public.users enable row level security;

-- No public SELECT policy intentionally — reads go through the definer function
-- or a future JWT-based policy.

-- Allow the anon role to call the upsert function (the DEFINER does the write).
grant execute on function public.upsert_oidc_user(text, text, text, boolean, text, text, text, jsonb)
  to anon, authenticated;
