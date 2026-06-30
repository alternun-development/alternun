-- Fix: wallet_accounts/wallet_preferences/wallet_sessions (20260417_0008) were created with a
-- foreign key to auth.users(id), but public.users is the vendor-independent user registry and is
-- *intentionally* not linked to auth.users (see 20260319_0003's comment) — its IDs are generated
-- independently. resolveUserId() (apps/api/src/common/auth/resolve-user-id.ts) returns a
-- public.users.id for the Authentik/JWT auth path, which is the primary path for this app. Every
-- wallet_accounts/wallet_preferences insert for those users was failing with a foreign key
-- violation (23503), silently swallowed by the client's generic error handling — the wallet was
-- created locally on-device but never registered server-side.
--
-- public.users.id is `text` (not the `uuid` declared in 20260319_0003 — superseded by an
-- undocumented/manually-applied schema change, confirmed live: dev's public.users.id is text,
-- values are still UUID-formatted strings). The wallet tables' user_id columns are `uuid`, which
-- is incompatible with a text FK target, so the columns are converted to text below. All four
-- tables are empty in dev (feature never successfully wrote a row, per the bug above), so this is
-- a safe, lossless type change.

-- RLS policies on these tables used auth.uid() = user_id, which only makes sense when user_id
-- referenced auth.users. With public.users as the FK target, auth.uid() (Supabase Auth's session
-- user) no longer reliably matches user_id (it may not even be populated for Authentik-only
-- users). The API already enforces per-user ownership at the application layer (every query
-- filters by the resolveUserId()-derived userId, never trusting a client-supplied id — see
-- wallet.repository.ts's header comment) and connects using the service role key, which bypasses
-- RLS anyway. Drop these policies (also required before the column type change below, since a
-- policy referencing user_id blocks ALTER COLUMN TYPE) so they don't silently block service-role
-- writes for users with no Supabase Auth session, and keep RLS enabled with no policy as a
-- default-deny safety net against any future non-service-role access path being added by mistake.
drop policy if exists wallet_accounts_user_owns_rows on public.wallet_accounts;
drop policy if exists wallet_preferences_user_owns_rows on public.wallet_preferences;
drop policy if exists wallet_sessions_user_owns_rows on public.wallet_sessions;
drop policy if exists wallet_encrypted_seeds_user_owns_rows on public.wallet_encrypted_seeds;

alter table public.wallet_accounts
  drop constraint if exists wallet_accounts_user_id_fkey;
alter table public.wallet_accounts
  alter column user_id type text using user_id::text;
alter table public.wallet_accounts
  add constraint wallet_accounts_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.wallet_preferences
  drop constraint if exists wallet_preferences_user_id_fkey;
alter table public.wallet_preferences
  alter column user_id type text using user_id::text;
alter table public.wallet_preferences
  add constraint wallet_preferences_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.wallet_sessions
  drop constraint if exists wallet_sessions_user_id_fkey;
alter table public.wallet_sessions
  alter column user_id type text using user_id::text;
alter table public.wallet_sessions
  add constraint wallet_sessions_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- wallet_encrypted_seeds (20260629_0002) is deferred/unused (no server-side seed backup — see
-- 99-future-server-backup-upgrade.md) but fix its FK too for consistency if it's ever activated.
alter table public.wallet_encrypted_seeds
  drop constraint if exists wallet_encrypted_seeds_user_id_fkey;
alter table public.wallet_encrypted_seeds
  alter column user_id type text using user_id::text;
alter table public.wallet_encrypted_seeds
  add constraint wallet_encrypted_seeds_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;
