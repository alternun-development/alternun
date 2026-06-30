# SEC-02 — RLS policies removed from wallet tables; ownership enforced app-layer only

**Priority:** 🟠 HIGH — defense-in-depth gap; no current data exposure, but no database-level guard either  
**Status:** Not started  
**Root cause:** Migration `20260630_0001_fix_wallet_tables_user_fk.sql` correctly dropped the old `auth.uid() = user_id` RLS policies (they no longer made sense after repointing FK to `public.users` rather than `auth.users`) but did not replace them with new policies

---

## Context

`wallet_accounts`, `wallet_preferences`, `wallet_sessions`, and `wallet_encrypted_seeds` all have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — RLS is ON — but after the FK fix migration, there are **zero policies** on any of them. In Postgres, "RLS enabled, zero policies" means **default-deny for all roles except the table owner and superuser**.

The API connects using the **Supabase service-role key**, which bypasses RLS entirely (by design — service role is a superuser-equivalent in Supabase). So for the current API access pattern this is safe: the application correctly filters every query by `user_id = resolveUserId(token)` at the application layer (`wallet.repository.ts`'s header comment documents this explicitly).

## Why this is still a risk

1. **Defense-in-depth gap**: if a future developer adds a code path that accidentally queries without the `user_id` filter (a common oversight in growing codebases), there's no database-level catch. With proper RLS policies, the DB would reject cross-user data access even if the application code forgets.
2. **Non-service-role access**: if anyone ever accesses these tables via a Supabase client initialized with the anon key or a user JWT (e.g., from a future Supabase Edge Function, a direct SDK call in a new mobile feature, a developer debugging via the Supabase dashboard's table editor with RLS-respecting role), they'd get zero rows or errors — not the cross-user leak, but confusing and potentially masking bugs.
3. **The original RLS test** (in `09-testing-qa-plan.md`) used `auth.uid()` which is only valid when the request comes with a Supabase JWT. That path is now inconsistent with the actual auth model (Authentik/Better Auth JWTs → `public.users.id`, not `auth.users.id` / `auth.uid()`).

## What the new policies should look like

The challenge: `auth.uid()` (Supabase's built-in for the authenticated user's UUID in `auth.users`) no longer reliably maps to `wallet_accounts.user_id` (now `public.users.id`, a separate ID space). Options:

### Option A — Custom JWT claim (recommended)

Provision a custom JWT claim `app_user_id` containing the `public.users.id` for authenticated sessions, then use it in RLS:

```sql
-- On wallet_accounts:
create policy wallet_accounts_rls on public.wallet_accounts
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb ->> 'app_user_id');
```

This requires: every auth path (Authentik OIDC, Better Auth) embeds `app_user_id: <public.users.id>` in JWTs, and Supabase is configured to expose this via `request.jwt.claims`. Check whether Alternun's JWTs already include this claim — `apps/api/src/common/auth/resolve-user-id.ts` reads `app_user_id` from JWT claims, suggesting it DOES exist.

### Option B — Postgres function

```sql
create function public.current_app_user_id() returns text as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'app_user_id';
$$ language sql stable;
```

Then policy: `using (user_id = public.current_app_user_id())`.

### Option C — Keep zero policies intentionally, add documentation

If the service-role-only pattern is firm and will not change, explicitly document the `enable row level security` with a comment stating "default-deny on zero policies is intentional — this table is service-role-only, RLS enforcement is purely defense-in-depth against accidental anon-key access." This is acceptable if Option A/B add too much complexity, but it should be an explicit decision, not an oversight.

## Files to change

- New migration: `supabase/migrations/YYYYMMDD_NNNN_wallet_rls_with_app_user_id.sql`
- Check `packages/infra/` for JWT claim provisioning if Option A is chosen

## Acceptance test

1. With an `authenticated` role session whose JWT has `app_user_id = user_A_id`:
   - `SELECT * FROM wallet_accounts WHERE user_id = user_A_id` → returns rows.
   - `SELECT * FROM wallet_accounts WHERE user_id = user_B_id` → returns 0 rows (RLS blocks).
   - `INSERT INTO wallet_accounts (user_id, ...) VALUES (user_B_id, ...)` → rejected by RLS.
2. With the service-role key: full access (bypasses RLS — no change to existing API behavior).
