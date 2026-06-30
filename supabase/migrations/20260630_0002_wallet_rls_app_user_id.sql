-- Restore defense-in-depth RLS on wallet tables using the `app_user_id` JWT claim.
--
-- Background: migration 20260630_0001 correctly dropped the old `auth.uid() = user_id` policies
-- (they no longer applied after the FK was repointed from auth.users to public.users) but left
-- zero policies in place. "RLS enabled + zero policies" is Postgres default-deny for non-owner
-- roles, which keeps the tables safe for direct access, but provides no application-level row
-- filtering if a future code path uses a non-service-role connection.
--
-- The API currently uses the Supabase service role key for all wallet queries — that bypasses RLS
-- entirely, so these policies do NOT affect existing application behavior. They are purely
-- defense-in-depth: if a future Edge Function, client SDK call, or developer debugging session
-- uses a user-JWT connection instead of the service role, the policies ensure cross-user data
-- access is rejected at the database layer even if the application code forgets to filter.
--
-- The `app_user_id` JWT claim is set by the auth-exchange module
-- (apps/api/src/modules/auth-exchange/auth-exchange-jwt.ts:138). It contains the
-- `public.users.id` text value — the same ID that wallet table `user_id` columns now reference
-- after 20260630_0001 changed them from uuid to text.
--
-- Note: `current_setting('request.jwt.claims', true)` is only populated by PostgREST when the
-- request carries a user JWT (not the service role key). Using `true` as the second argument
-- (missing_ok) means it returns NULL rather than throwing when not set — which leaves the policy
-- as `user_id = NULL`, correctly denying access for any unauthenticated or service-role connection
-- (service role bypasses RLS anyway, so this is only reached with user JWTs).

create or replace function public.wallet_current_user_id()
returns text
language sql
stable
as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'app_user_id'
$$;

drop policy if exists wallet_accounts_app_user_rls on public.wallet_accounts;
create policy wallet_accounts_app_user_rls
  on public.wallet_accounts
  for all
  using (user_id = public.wallet_current_user_id())
  with check (user_id = public.wallet_current_user_id());

drop policy if exists wallet_preferences_app_user_rls on public.wallet_preferences;
create policy wallet_preferences_app_user_rls
  on public.wallet_preferences
  for all
  using (user_id = public.wallet_current_user_id())
  with check (user_id = public.wallet_current_user_id());

drop policy if exists wallet_sessions_app_user_rls on public.wallet_sessions;
create policy wallet_sessions_app_user_rls
  on public.wallet_sessions
  for all
  using (user_id = public.wallet_current_user_id())
  with check (user_id = public.wallet_current_user_id());

drop policy if exists wallet_encrypted_seeds_app_user_rls on public.wallet_encrypted_seeds;
create policy wallet_encrypted_seeds_app_user_rls
  on public.wallet_encrypted_seeds
  for all
  using (user_id = public.wallet_current_user_id())
  with check (user_id = public.wallet_current_user_id());
