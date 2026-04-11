# Alternun Better Auth Testnet Execution Plan

## Objective

Complete the migration from Supabase-first auth execution to Better Auth execution plus Authentik-issued application sessions, then validate the final behavior on testnet before any wider rollout.

This is a cross-team plan covering:

- `packages/auth`
- `apps/api`
- Better Auth self-hosted infrastructure
- Authentik issuer alignment
- testnet rollout and rollback

## Current State

What is already true:

- `packages/auth` has a provider-agnostic facade and compatibility adapters.
- Better Auth has an execution adapter in code.
- Authentik remains the configured issuer default.
- Legacy Supabase execution still remains the default runtime path.
- The issuer provider already prefers `AUTH_EXCHANGE_URL` when it is configured.

What is not true yet:

- Better Auth is not yet the real execution service on testnet.
- The backend exchange contract can already mint issuer-owned tokens when the backend signing key is available, but it still falls back to compatibility payloads when that key or path is missing.
- Identity persistence still depends on compatibility behavior.
- Email still depends on the current Supabase-oriented operational path.

## Target Testnet Shape

Testnet should look like this:

1. App calls `@alternun/auth`.
2. `@alternun/auth` uses `AUTH_EXECUTION_PROVIDER=better-auth`.
3. Better Auth executes Google, GitHub, and Apple social login flows.
4. Email/password continues through the legacy compatibility execution path and does not depend on Better Auth.
5. Backend `POST /auth/exchange` reconciles the Better Auth identity to an Alternun principal.
6. Authentik-aligned issuer claims become the final application session.
7. App authorization depends on canonical issuer claims and app-owned persistence, not Better Auth cookies and not Supabase user metadata.

## Self-Hosted Better Auth Resources

Validated against Better Auth official docs on `2026-04-09`:

- Installation: https://www.better-auth.com/docs/installation
- Options: https://www.better-auth.com/docs/reference/options
- Dynamic base URL: https://better-auth.com/docs/concepts/dynamic-base-url
- Google provider: https://www.better-auth.com/docs/authentication/google
- GitHub provider: https://www.better-auth.com/docs/authentication/github
- Apple provider: https://www.better-auth.com/docs/authentication/apple
- Email and password: https://www.better-auth.com/docs/authentication/email-password
- Rate limiting: https://www.better-auth.com/docs/concepts/rate-limit

Provision these before enabling Better Auth on testnet:

| Resource                    | Why it is needed                                             | Minimum decision                                |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Better Auth service runtime | Handles `/api/auth/*` execution flows                        | Run inside `apps/api` or as a dedicated service |
| Stable HTTPS domain         | Required for OAuth callbacks and Apple                       | Use a dedicated testnet auth execution domain   |
| Better Auth secret          | Required by Better Auth                                      | Store in Secrets Manager                        |
| Postgres database           | Better Auth account and session persistence                  | Use dedicated schema or dedicated database      |
| Secondary storage           | Verification and rate limit data for multi-instance behavior | Redis or explicit database-backed strategy      |
| OAuth credentials           | Google, GitHub, Apple providers                              | Separate testnet credentials                    |
| Email sender path           | Verification and reset emails                                | Postmark or SES, not Supabase-only long term    |
| Logging and health checks   | Required for exchange and callback debugging                 | Structured logs plus health endpoint            |

## Recommended Testnet Domains

Use explicit testnet domains instead of overloading current Authentik domains.

- Better Auth execution service: `https://testnet-auth.alternun.co`
- Authentik issuer remains under `https://testnet.sso.alternun.co/...`
- Backend exchange remains under the testnet API domain

If the team chooses a different host, update the config contract and OAuth provider redirect URIs together.

## Workstream 1: Better Auth Service

Deliverables:

- Real Better Auth server runtime
- Real Better Auth client wiring
- Google and GitHub providers enabled
- Email/password remains available through the legacy compatibility path
- Apple configured or explicitly deferred

Tasks:

1. Decide service topology:
   - Option A: mount Better Auth inside `apps/api`
   - Option B: deploy dedicated auth execution service
2. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
3. Configure Better Auth database and generate required schema.
4. Configure dynamic base URL or a fixed base URL for testnet.
5. Configure Google and GitHub redirect URIs to `/api/auth/callback/{provider}` on the Better Auth domain.
6. Configure Apple only after HTTPS domain and native requirements are ready.
7. Enable rate limiting with durable storage if more than one instance will run.

Exit criteria:

- Better Auth health check passes on the testnet domain.
- Google sign-in reaches the Better Auth callback successfully.
- GitHub sign-in reaches the Better Auth callback successfully.
- Email/password sign-up and sign-in work in testnet through the legacy-compatible execution path.

## Workstream 2: NestJS Exchange Endpoint

Deliverables:

- `POST /auth/exchange`
- principal reconciliation
- linked account upsert
- provisioning event write
- issuer session payload returned to the package

Tasks:

1. Define the controller and DTO contract from `packages/auth/BACKEND_HANDOFF.md`.
2. Validate normalized `externalIdentity` payloads.
3. Reconcile external identities into app-owned principal records.
4. Return canonical issuer claims and token metadata.
5. Add structured logging for exchange success and failure.

Exit criteria:

- The package no longer has to synthesize issuer sessions from execution tokens.
- Repeated sign-ins for the same provider user id map to the same principal.
- Failure modes are observable and typed.

## Workstream 3: Package Wiring Finalization

Deliverables:

- Better Auth execution path selected by env in testnet
- issuer provider calling the backend exchange
- no dependence on raw Better Auth tokens as final session authority

Tasks:

1. Complete the backend exchange path so `AuthentikIssuerProvider.exchangeIdentity(...)` can stop falling back to local issuer synthesis.
2. Keep `SupabaseExecutionProvider` available only as a rollback path.
3. Keep `AppAuthProvider` and `useAuth()` stable.
4. Preserve `signInWithGoogle`, `signUpWithEmail`, `signIn`, `signOut`, `getUser`, and auth-state subscriptions.

Exit criteria:

- `AUTH_EXECUTION_PROVIDER=better-auth` works on testnet without breaking current consumer APIs.
- `getSessionToken()` resolves to the canonical issuer token, not the Better Auth session token.

## Workstream 4: Persistence Migration

Deliverables:

- app-owned principal model
- user projection model
- linked auth account model
- wallet linkage model
- provisioning event model

Tasks:

1. Replace direct UI/runtime provisioning dependence on `upsert_oidc_user`.
2. Decide whether the first persisted model lives in Supabase Postgres tables or in another app-owned Postgres path.
3. Implement repository writes for linked accounts and provisioning events.
4. Move wallet linking behind repository-owned persistence.

Exit criteria:

- `upsert_oidc_user` is no longer the only real persistence path.
- linked accounts and provisioning events are no longer placeholder-only.

## Workstream 5: Email Cutover

Deliverables:

- chosen non-Supabase email provider path
- verification email flow
- password reset flow
- operational scripts aligned with the provider abstraction

Tasks:

1. Choose `postmark` or `ses` as the first non-Supabase testnet provider.
2. Configure sender domain and templates.
3. Verify Better Auth email verification and reset hooks route through the selected provider.
4. Keep Supabase email as a rollback path only.

Exit criteria:

- Email verification and reset work end to end on testnet without Supabase-specific runtime coupling.

## Workstream 6: Testnet Validation

Test these flows on real testnet domains:

- Google sign-in on web
- GitHub sign-in on web
- Apple sign-in if enabled
- email sign-up plus verification
- email sign-in
- password reset
- sign-out
- repeated login for the same user
- provider linking if enabled
- callback return-to behavior

Acceptance checks:

- final app session is canonical issuer state
- Better Auth cookies are execution-only
- principal id is stable across repeated sign-ins
- linked account records are correct
- rollback to legacy Supabase execution can be re-enabled quickly

## Rollout Sequence

1. Deploy Better Auth service to testnet.
2. Deploy backend exchange endpoint to testnet and wire the signing key runtime.
3. Wire `packages/auth` to call the exchange endpoint.
4. Enable `AUTH_EXECUTION_PROVIDER=better-auth` for testnet clients only.
5. Run the validation matrix.
6. Fix identity mapping and callback regressions.
7. Freeze the interface and produce a go or no-go decision.

## Rollback Plan

Keep these rollback levers available during testnet:

- `AUTH_EXECUTION_PROVIDER=supabase`
- `AUTH_ISSUER_PROVIDER=authentik`
- `AUTH_EMAIL_PROVIDER=supabase`

Rollback should be config-only, not code rollback, during the testnet burn-in period.

## Recommended Owner Split

| Area                                            | Primary owner      |
| ----------------------------------------------- | ------------------ |
| Better Auth deployment and secrets              | Infra              |
| OAuth provider credentials and callback domains | Infra + platform   |
| `/auth/exchange` contract                       | API                |
| package wiring and facade behavior              | `packages/auth`    |
| testnet validation and regression tracking      | mobile + web + API |

## Go/No-Go Gate For Production Planning

Do not prepare production rollout until testnet proves all of the following:

- Better Auth execution is stable for Google and GitHub
- issuer exchange is stable
- no critical callback regressions remain
- rollback is proven
- linked account and principal persistence are correct
- email verification and password reset are stable
