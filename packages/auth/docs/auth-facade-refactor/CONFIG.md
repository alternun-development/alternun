# Alternun Auth Config

This is the short operator-facing config guide for `@alternun/auth`.

For the more exhaustive contract, see `CONFIG_CONTRACT.md`.

## Provider Selection

| Variable                             | Values                         | Purpose                                                                         | Default     |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------- | ----------- |
| `AUTH_EXECUTION_PROVIDER`            | `better-auth`, `supabase`      | Selects the login execution engine                                              | `supabase`  |
| `AUTH_ISSUER_PROVIDER`               | `authentik`, `supabase-legacy` | Selects the canonical issuer boundary                                           | `authentik` |
| `AUTH_EMAIL_PROVIDER`                | `supabase`, `postmark`, `ses`  | Selects transactional email delivery                                            | `supabase`  |
| `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED` | `true`, `false`                | Forces `/auth/exchange` to fail closed when issuer-owned minting is unavailable | `false`     |

Accepted aliases include:

- `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER`
- `EMAIL_PROVIDER`
- `EMAIL_SMTP_PROVIDER`
- `AUTHENTIK_ISSUER`
- `AUTHENTIK_CLIENT_ID`
- `AUTHENTIK_REDIRECT_URI`
- `AUTH_BETTER_AUTH_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_CLIENT_ID`
- `EXPO_PUBLIC_AUTH_EXCHANGE_URL`

## Runtime Behavior

- `AUTH_EXECUTION_PROVIDER=better-auth` means Better Auth is the primary execution path.
- Legacy Supabase session state is no longer allowed to silently win over a Better Auth session.
- Supabase-backed execution remains available as the compatibility path when `AUTH_EXECUTION_PROVIDER=supabase`.
- Web social login now prefers the Better Auth browser client when it is available, and the provider falls back to the explicit Better Auth social/email routes only when the browser client cannot be created.
- Email/password compatibility can still fall back to the legacy client when the Better Auth client is not available.
- Authentik remains the issuer/trust layer.
- `AUTH_EXCHANGE_URL` is the backend handoff point for canonical issuer exchange.
- `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true` is the strict rollout mode for the backend handoff; it disables compatibility fallback when canonical issuer minting is missing.
- The canonical browser-facing Better Auth URL should stay on the API origin root; the client/proxy layers append `/auth` internally. The internal dev service stays on `http://localhost:9083` during local development and can remain behind the API proxy in deployed environments.
- Local dev uses `BETTER_AUTH_URL` for the private proxy target. Deployed stacks can pass that proxy target as `AUTH_BETTER_AUTH_URL` in the backend runtime, while the Expo bundle still consumes the browser-facing `AUTH_BETTER_AUTH_URL` / `EXPO_PUBLIC_BETTER_AUTH_URL` value.
- When a Better Auth URL is configured but the execution flag is omitted, the runtime now promotes to `better-auth` automatically so the configured URL stays authoritative. An explicit `supabase` flag still wins for rollback.
- The API proxy answers browser `OPTIONS` preflight locally for `/auth/*` and only forwards the actual Better Auth request to the private service.
- The mobile web callback now refreshes the Better Auth execution session before returning to the dashboard, and it clears stale legacy OIDC state on Better Auth runs so the app does not rehydrate the wrong session source after redirect.

## Required Authentik Inputs

Use these when Authentik is the issuer:

- `EXPO_PUBLIC_AUTHENTIK_ISSUER`
- `EXPO_PUBLIC_AUTHENTIK_CLIENT_ID`
- `EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI`

The browser callback URL defaults to `https://<origin>/auth/callback` when the browser origin is available.

## Required Better Auth Inputs

Use these when `AUTH_EXECUTION_PROVIDER=better-auth` and a real Better Auth service exists:

- `AUTH_BETTER_AUTH_URL`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_DATABASE_URL`
- provider secrets such as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` or `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`

When you register the OAuth app in Discord, the Better Auth callback on the API origin is:

- local: `http://localhost:9083/auth/callback/discord`
- testnet/deployed API origin: `https://testnet.api.alternun.co/auth/callback/discord`

## Required Supabase Legacy Inputs

Use these only for the compatibility path:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Operational Notes

- Use `AUTH_EXECUTION_PROVIDER=better-auth` for the testnet rollout; keep `supabase` only as the rollback path. If the Better Auth URL is set and the flag is omitted, the runtime now auto-promotes to Better Auth instead of drifting back to Authentik.
- Use `AUTH_ISSUER_PROVIDER=authentik` for the canonical session layer.
- Do not rely on Supabase user metadata as the long-term authz source of truth.
- Prefer the facade and provider contracts in `src/core/` and `src/facade/` over direct client wiring in app code.
