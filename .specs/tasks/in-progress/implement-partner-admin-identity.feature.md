---
title: Implement partner admin identity foundation
priority: high
status: in-progress
---

## Initial User Prompt

ok I like that , cratf the whole task step by step use the `login.alternun.co` aproach , and put the task on in progrestt move from dratf create the full task spec and start impelenting that

## Summary

Build a secure partner-admin identity model for `admin.alternun.co` that uses
`login.alternun.co` as the hosted identity entry point. Authentik remains the
sole credential, recovery, MFA, and issuer authority. Supabase remains the
application data and principal projection layer; it does not become a second
password system.

The target user set includes external allies, so the login experience must stay
simple, but the security posture must be stronger than the current browser-token
SPA model. No partner-wide auto-enrollment is allowed.

## Scope

- Hosted login entry on `login.alternun.co` for partner and internal admin users
- Invitation-only partner access with least-privilege Authentik groups
- Server-side admin authorization and tenant/org scope enforcement
- Admin session hardening away from browser bearer-token storage
- Authentik-to-Supabase identity projection hardening
- Controlled issuer/domain migration from `sso.alternun.co` to `login.alternun.co`

## Non-Goals

- No production DNS, Authentik, or OAuth-provider cutover from this repo task alone
- No custom password form inside the admin SPA
- No automatic access for every `@alternun.io` or partner-domain account
- No second identity source of truth in Supabase

## Acceptance Criteria

1. `admin.alternun.co/login` delegates credential entry to hosted Authentik on
   `login.alternun.co`; the admin SPA never handles raw passwords.
2. External partner users are invitation-only and receive explicit roles such as
   `partner_readonly` and future `partner_operator`.
3. The API enforces admin authentication, permissions, and organization scope on
   every admin route; UI-only authorization is not relied on for protection.
4. Admin browser sessions no longer depend on page-readable bearer tokens stored
   in `localStorage`.
5. Authentik webhook and projection sync fail closed when required shared
   secrets or backend credentials are missing.
6. Username creation is automatic for invited Authentik users when the email is
   known, so they do not hit a separate username screen.
7. The `sso` to `login` issuer migration is handled explicitly, including
   redirects, JWT issuer validation, and Supabase principal reconciliation.

## Architecture Notes

- `login.alternun.co` is the identity surface. It hosts the branded Authentik
  login, recovery, invitation, and MFA flows.
- `admin.alternun.co` remains the admin application surface.
- Authentik is the federated IdP and canonical issuer.
- Supabase stores app data and principal projections keyed by immutable
  `(iss, sub)`.
- The current admin SPA token model is transitional and must be replaced by a
  same-origin BFF or equivalent server session boundary.

## References

- [analysis-partner-admin-identity.md](/home/ed/Documents/Alternun/alternun/.specs/analysis/analysis-partner-admin-identity.md)
- [admin-sso-and-access-control.md](/home/ed/Documents/Alternun/alternun/apps/docs/docs/Architecture/admin-sso-and-access-control.md)
- [authentication-and-session-flow.md](/home/ed/Documents/Alternun/alternun/apps/docs/docs/Architecture/authentication-and-session-flow.md)
- [security-and-quality.md](/home/ed/Documents/Alternun/alternun/apps/docs/docs/Architecture/security-and-quality.md)

## Implementation Process

### Step 1: Harden the current identity sync boundary [DONE]

Type: critical

- [x] Reject Authentik webhook calls when `AUTHENTIK_WEBHOOK_SECRET` is absent
- [x] Reject invalid webhook secrets without allowing unequal-length
      `timingSafeEqual` failures
- [x] Require a backend service-role key for Authentik-to-Supabase sync instead
      of falling back to anon/public keys
- [x] Add regression coverage for the hardened webhook and sync behavior

Expected output:

- `apps/api/src/modules/authentik/authentik.controller.ts`
- `apps/api/src/modules/authentik/supabase-sync.ts`
- `apps/api/test/authentik-security.test.js`

#### Verification

- `node --experimental-test-module-mocks -r ts-node/register/transpile-only --test test/authentik-security.test.js` from `apps/api`

### Step 2: Add explicit admin principal and permission enforcement in the API [DONE]

Type: critical
Depends on: Step 1

- [x] Introduce a dedicated admin-auth module separate from `resolveUserId`
- [x] Validate issuer, audience, expiry, JWKS/signature, and required claims
- [x] Define `platform_owner`, `internal_admin`, `partner_operator`, and
      `partner_readonly` permissions
- [x] Enforce organization scope and deny cross-tenant access by default
- [x] Add direct HTTP tests proving read-only users receive `403` on mutations

Expected output:

- new `apps/api/src/common/admin-auth/*`
- updated admin-facing controllers/services
- new `apps/api/test/*admin*`

#### Verification

- `node --experimental-test-module-mocks -r ts-node/register/transpile-only --test test/admin-auth.authorization.test.js` from `apps/api`

### Step 3: Replace browser bearer-token admin sessions with a server session boundary

Type: critical
Depends on: Step 2

- [ ] Add a same-origin admin session callback/proxy layer
- [ ] Move refresh/session material out of `window.localStorage`
- [ ] Use secure `HttpOnly` cookies plus CSRF protection for mutations
- [ ] Update the admin SPA data provider to call same-origin authenticated routes
- [ ] Keep `/login` as an entry page, not a password-processing page

Expected output:

- admin BFF/server runtime changes
- `apps/admin` auth and data-provider updates
- focused admin regression tests

### Step 4: Extend Authentik bootstrap for partner groups, invites, and username automation

Type: critical
Depends on: Step 2

- [ ] Create explicit groups for `Alternun Partner Read Only`,
      `Alternun Partner Operator`, `Alternun Internal Admin`, and
      `Alternun Platform Owner`
- [ ] Emit least-privilege claims per group instead of mapping everything to
      `platform_admin`
- [ ] Configure invitation-only local credential and recovery flows on
      `login.alternun.co`
- [ ] Auto-derive usernames from email during invitation/enrollment
- [ ] Enforce MFA before admin access and step-up for destructive actions

Expected output:

- `packages/infra/scripts/templates/bootstrap-authentik-integrations.py`
- related infra config and tests

### Step 5: Migrate identity defaults and rollout config to `login.alternun.co`

Type: critical
Depends on: Step 3, Step 4

- [ ] Update infra defaults, admin issuer config, and example deployment config
- [ ] Thread `login.alternun.co` through Route53/TLS/OIDC settings
- [ ] Preserve or deliberately retire old `sso` issuer validation paths
- [ ] Reconcile Supabase principal records for issuer changes
- [ ] Document the cutover and reauthentication plan

Expected output:

- `packages/infra/modules/identity.ts`
- `packages/infra/modules/admin-site.ts`
- `packages/infra/.env.example`
- deployment/config docs and tests

### Step 6: Pilot, validate, and prepare production cutover

Type: critical
Depends on: Step 5

- [ ] Validate invited partner login, username automation, MFA, and revocation
- [ ] Validate read-only and operator permissions against real admin routes
- [ ] Validate organization scoping and audit-event capture
- [ ] Confirm no duplicate principals across old/new issuer values
- [ ] Produce operator rollout checklist for DNS, Authentik, OAuth providers,
      and secrets rotation

## Definition of Done

- The acceptance criteria above are satisfied or explicitly split into follow-up
  tasks with documented blockers.
- API authorization is server-enforced for admin actions.
- Hosted Authentik login on `login.alternun.co` is the only credential UI.
- Supabase sync is hardened and no longer uses public browser keys.
- Tests exist for every security-sensitive slice that lands.
- Cutover items requiring production authority are documented separately before
  any live migration.

## Current Status

- 2026-09-01: Step 1 completed in repo code and tests.
- 2026-09-01: Step 2 completed with dedicated admin JWT verification,
  organization-scoped admin guards, and guarded allowance routes covered by
  direct HTTP authorization tests.
- 2026-09-01: The admin SPA now aligns to the same canonical admin roles and
  renders a restricted partner workspace instead of the old internal-only role
  assumptions for ally accounts.
- Remaining steps require additional application and infrastructure work, but
  the task is now promoted to `in-progress` with the `login.alternun.co`
  approach as the canonical direction.
