# Auth Config Contract

## Purpose

This document defines the configuration surface for the staged migration from Supabase-first auth execution to Better Auth execution plus Authentik-issued application sessions.

It covers:

- package runtime flags used by `@alternun/auth`
- Better Auth service environment and secrets
- backend exchange configuration
- testnet rollout expectations

## Provider Selection

| Variable                  | Values                         | Purpose                                              | Current Default |
| ------------------------- | ------------------------------ | ---------------------------------------------------- | --------------- |
| `AUTH_EXECUTION_PROVIDER` | `better-auth`, `supabase`      | Selects the login execution engine                   | `supabase`      |
| `AUTH_ISSUER_PROVIDER`    | `authentik`, `supabase-legacy` | Selects the canonical issuer or compatibility bridge | `authentik`     |
| `AUTH_EMAIL_PROVIDER`     | `supabase`, `postmark`, `ses`  | Selects transactional auth email delivery            | `supabase`      |

## Package Runtime Inputs

These variables are read by `packages/auth/src/runtime/config.ts`.

| Variable                             | Required                           | Purpose                                                                      |
| ------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------- |
| `AUTH_EXECUTION_PROVIDER`            | No                                 | Selects Better Auth or legacy Supabase execution                             |
| `AUTH_ISSUER_PROVIDER`               | No                                 | Selects Authentik or the legacy issuer bridge                                |
| `AUTH_EMAIL_PROVIDER`                | No                                 | Selects the email provider path                                              |
| `AUTH_BETTER_AUTH_URL`               | Yes for Better Auth rollout        | Base URL for the Better Auth service                                         |
| `AUTH_BETTER_AUTH_CLIENT_ID`         | No                                 | Reserved for Better Auth client/runtime integration                          |
| `AUTH_BETTER_AUTH_API_KEY`           | No                                 | Reserved for service-to-service Better Auth calls if needed                  |
| `AUTH_EXCHANGE_URL`                  | Yes for canonical exchange rollout | Backend endpoint used to exchange execution identity into the issuer session |
| `EXPO_PUBLIC_SUPABASE_URL`           | Yes for legacy fallback            | Legacy Supabase URL                                                          |
| `EXPO_PUBLIC_SUPABASE_KEY`           | Yes for legacy fallback            | Legacy Supabase key                                                          |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`      | Optional                           | Legacy anon key alias                                                        |
| `EXPO_PUBLIC_AUTHENTIK_ISSUER`       | Yes                                | Canonical Authentik issuer URL                                               |
| `EXPO_PUBLIC_AUTHENTIK_CLIENT_ID`    | Yes                                | Public OIDC client id                                                        |
| `EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI` | Optional                           | Explicit redirect URI override                                               |
| `EMAIL_FROM`                         | Yes for non-Supabase email rollout | Sender email                                                                 |
| `EMAIL_SENDER_NAME`                  | Optional                           | Sender display name                                                          |
| `EMAIL_LOCALE`                       | Optional                           | Default email locale                                                         |

## Compatibility Aliases

These aliases are still accepted:

- `EMAIL_PROVIDER`
- `EMAIL_SMTP_PROVIDER`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_ANON_KEY`
- `AUTHENTIK_ISSUER`
- `AUTHENTIK_CLIENT_ID`
- `AUTHENTIK_REDIRECT_URI`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_CLIENT_ID`
- `BETTER_AUTH_API_KEY`
- `EXPO_PUBLIC_AUTH_EXCHANGE_URL`

## Better Auth Service Environment

These values are required for the self-hosted Better Auth runtime.

Validated against Better Auth official docs on `2026-04-09`:

- Installation: https://www.better-auth.com/docs/installation
- Options: https://www.better-auth.com/docs/reference/options
- Dynamic base URL: https://better-auth.com/docs/concepts/dynamic-base-url
- Google: https://www.better-auth.com/docs/authentication/google
- GitHub: https://www.better-auth.com/docs/authentication/github
- Apple: https://www.better-auth.com/docs/authentication/apple
- Email and password: https://www.better-auth.com/docs/authentication/email-password
- Rate limiting: https://www.better-auth.com/docs/concepts/rate-limit

| Variable                      | Required                       | Purpose                                                                        |
| ----------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`          | Yes                            | Primary Better Auth secret for signing, hashing, and encryption                |
| `BETTER_AUTH_URL`             | Yes                            | External base URL for Better Auth callback generation                          |
| `BETTER_AUTH_SECRETS`         | Optional                       | Rotating secret set if key rotation is needed                                  |
| `BETTER_AUTH_ALLOWED_HOSTS`   | Recommended                    | Allowed hosts for dynamic base URL behavior in preview and testnet             |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Recommended                    | Explicit trusted origins where provider-specific flows require them            |
| `BETTER_AUTH_DATABASE_URL`    | Yes                            | Database DSN if Better Auth is backed by Postgres                              |
| `BETTER_AUTH_REDIS_URL`       | Recommended for multi-instance | Secondary storage for verification and rate limits if memory is not acceptable |
| `GOOGLE_CLIENT_ID`            | Yes for Google                 | Google OAuth credentials                                                       |
| `GOOGLE_CLIENT_SECRET`        | Yes for Google                 | Google OAuth credentials                                                       |
| `GITHUB_CLIENT_ID`            | Yes for GitHub                 | GitHub OAuth credentials                                                       |
| `GITHUB_CLIENT_SECRET`        | Yes for GitHub                 | GitHub OAuth credentials                                                       |
| `APPLE_CLIENT_ID`             | Yes for Apple                  | Apple Service ID or native bundle-aware client id                              |
| `APPLE_CLIENT_SECRET`         | Yes for Apple                  | Apple-generated JWT client secret                                              |
| `APPLE_APP_BUNDLE_IDENTIFIER` | Recommended for native Apple   | Native Apple sign-in support                                                   |

## Better Auth Service Notes

- Better Auth needs an explicit `BETTER_AUTH_URL` or `baseURL` to avoid OAuth callback mismatches.
- Better Auth needs a database for standard session and account persistence unless you deliberately choose a stateless mode.
- Better Auth defaults to cookie-based session handling. Alternun should treat those cookies as execution-layer state, not as the final application session.
- Better Auth rate limiting defaults are not enough to define an Alternun production posture by themselves. For multi-instance testnet or production, use database or secondary storage instead of in-memory defaults.
- Apple requires HTTPS and cannot use localhost return URLs.
- Apple requires `https://appleid.apple.com` in trusted origins for the Better Auth config.
- GitHub flows require the `user:email` scope.

## Backend Exchange Inputs

| Variable                    | Required                  | Purpose                                                                |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `AUTH_EXCHANGE_URL`         | Yes for migration rollout | URL used by the package or service layer to call `POST /auth/exchange` |
| `AUTHENTIK_ISSUER`          | Yes                       | Issuer URL used by the backend for claim validation and token shaping  |
| `AUTHENTIK_CLIENT_ID`       | Yes                       | Client id used for issuer alignment                                    |
| `AUTHENTIK_JWT_SIGNING_KEY` | Yes for issuer-owned mode | Signing key used by the backend API to mint canonical issuer JWTs      |

## Testnet Target Shape

The first real rollout should use:

- `AUTH_EXECUTION_PROVIDER=better-auth`
- `AUTH_ISSUER_PROVIDER=authentik`
- `AUTH_EMAIL_PROVIDER=postmark` or `ses`
- `AUTH_BETTER_AUTH_URL=https://testnet.<better-auth-domain>`
- `AUTH_EXCHANGE_URL=https://testnet.api.alternun.co/auth/exchange`

Do not switch shared environments to this shape until the testnet execution plan gates pass.

## Runtime Notes

- Core auth logic should not read `process.env` directly outside the config adapter.
- `AppAuthProvider` should keep app ergonomics stable while switching the underlying provider graph.
- `createAuthFacade` can accept explicit provider instances for tests and server-side orchestration.
- `AUTH_BETTER_AUTH_CLIENT_ID` and `AUTH_BETTER_AUTH_API_KEY` are reserved for the rollout even though the current package implementation does not yet require them end to end.
- `AUTHENTIK_JWT_SIGNING_KEY` is required only when the backend should mint issuer-owned JWTs instead of returning compatibility fallback tokens.
