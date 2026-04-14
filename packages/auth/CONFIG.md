# Alternun Auth Config

This is the short operator-facing config guide for `@alternun/auth`.

For the more exhaustive contract, see `CONFIG_CONTRACT.md`.

## Provider Selection

| Variable                  | Values                         | Purpose                               | Default     |
| ------------------------- | ------------------------------ | ------------------------------------- | ----------- |
| `AUTH_EXECUTION_PROVIDER` | `better-auth`, `supabase`      | Selects the login execution engine    | `supabase`  |
| `AUTH_ISSUER_PROVIDER`    | `authentik`, `supabase-legacy` | Selects the canonical issuer boundary | `authentik` |
| `AUTH_EMAIL_PROVIDER`     | `supabase`, `postmark`, `ses`  | Selects transactional email delivery  | `supabase`  |

Accepted aliases include:

- `EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER`
- `EMAIL_PROVIDER`
- `EMAIL_SMTP_PROVIDER`
- `AUTHENTIK_ISSUER`
- `AUTHENTIK_CLIENT_ID`
- `AUTHENTIK_REDIRECT_URI`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_CLIENT_ID`
- `BETTER_AUTH_API_KEY`
- `EXPO_PUBLIC_AUTH_EXCHANGE_URL`

## Runtime Behavior

- `AUTH_EXECUTION_PROVIDER=better-auth` means Better Auth is the primary execution path.
- Legacy Supabase session state is no longer allowed to silently win over a Better Auth session.
- Supabase-backed execution remains available as the compatibility path when `AUTH_EXECUTION_PROVIDER=supabase`.
- Email/password compatibility can still fall back to the legacy client when the Better Auth client is not available.
- Authentik remains the issuer/trust layer.
- `AUTH_EXCHANGE_URL` is the backend handoff point for canonical issuer exchange.

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
- provider secrets such as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

## Required Supabase Legacy Inputs

Use these only for the compatibility path:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Operational Notes

- Keep `AUTH_EXECUTION_PROVIDER=supabase` until the Better Auth rollout is real and reachable.
- Use `AUTH_ISSUER_PROVIDER=authentik` for the canonical session layer.
- Do not rely on Supabase user metadata as the long-term authz source of truth.
- Prefer the facade and provider contracts in `src/core/` and `src/facade/` over direct client wiring in app code.
