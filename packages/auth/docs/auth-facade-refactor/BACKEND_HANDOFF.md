# Backend Handoff Contract

## Purpose

`POST /auth/exchange` is the missing production contract between the Better Auth execution layer and the canonical Alternun issuer session.

Without this endpoint, `packages/auth` can only simulate the issuer session locally. That is good enough for package tests and adapter wiring, but not good enough for real testnet rollout.

The package now calls `AUTH_EXCHANGE_URL` when it is configured, which means the backend exchange path is already part of the runtime graph. The current backend implementation can mint issuer-owned JWTs when `AUTHENTIK_JWT_SIGNING_KEY` is configured, and it can now fail closed when `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true` and the signing key is not available.

The current implementation now exists in `apps/api/src/modules/auth-exchange/*`, and it supports an issuer-owned mode plus a fallback compatibility mode. The compatibility mode is still the default safety net, but the strict rollout flag lets testnet or production fail closed instead of silently accepting compatibility fallback.

## Required Endpoint

`POST /auth/exchange`

This endpoint must:

1. accept a normalized execution identity
2. reconcile that identity against Alternun principals and linked accounts
3. create or refresh the canonical issuer session
4. return the issuer session payload used by apps, including `exchangeMode`

## Request Contract

```json
{
  "externalIdentity": {
    "provider": "google",
    "providerUserId": "google-123",
    "email": "ada@example.com",
    "emailVerified": true,
    "displayName": "Ada Lovelace",
    "avatarUrl": "https://example.com/avatar.png",
    "rawClaims": {}
  },
  "executionSession": {
    "provider": "better-auth",
    "accessToken": "exec-token",
    "refreshToken": "exec-refresh",
    "idToken": "exec-id",
    "expiresAt": 1730000000,
    "linkedAccounts": []
  },
  "context": {
    "trigger": "oauth-callback",
    "runtime": "web",
    "app": "mobile"
  }
}
```

## Response Contract

```json
{
  "issuerAccessToken": "issuer-token",
  "issuerRefreshToken": "issuer-refresh",
  "issuerIdToken": "issuer-id",
  "issuerExpiresAt": 1730003600,
  "exchangeMode": "issuer-owned",
  "principal": {
    "issuer": "https://testnet.sso.alternun.co/application/o/alternun-mobile/",
    "subject": "principal-id",
    "email": "ada@example.com",
    "roles": ["authenticated"],
    "metadata": {
      "appUserId": "uuid",
      "linkedAt": "2026-04-09T00:00:00.000Z"
    }
  },
  "linkedAccounts": [
    {
      "provider": "google",
      "providerUserId": "google-123",
      "type": "social"
    }
  ],
  "claims": {
    "iss": "https://testnet.sso.alternun.co/application/o/alternun-mobile/",
    "sub": "principal-id",
    "aud": "alternun-app",
    "email": "ada@example.com",
    "email_verified": true,
    "alternun_roles": ["authenticated"]
  }
}
```

## Non-Negotiable Backend Rules

- Do not expose raw Better Auth execution tokens as the final Alternun application session.
- Do not keep authorization state in mutable Supabase user metadata.
- Do not make `auth.users.id` the long-term principal id.
- Do not require UI/runtime code to call `upsert_oidc_user` directly.

## Required Claims

The issuer session returned to apps must include or derive:

- `iss`
- `sub`
- `aud`
- `email`
- `email_verified`
- `iat`
- `nbf`
- `exp`
- `roles` or `alternun_roles`
- `exchangeMode` should distinguish `issuer-owned` from `compatibility`
- `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true` should force the backend to reject compatibility fallback when issuer-owned minting is not available

## Required Persistence Outcomes

The backend should be able to persist or reconcile:

- principal records
- user projections
- linked auth accounts
- wallet accounts
- provisioning events

Target conceptual tables:

- `identity_principals`
- `app_users`
- `linked_auth_accounts`
- `wallet_accounts`
- `provisioning_events`

## Error Contract

Use stable error categories so the facade can handle them predictably:

- `invalid_execution_identity`
- `unsupported_provider`
- `issuer_exchange_failed`
- `identity_conflict`
- `provisioning_failed`
- `temporarily_unavailable`

Recommended response shape:

```json
{
  "error": {
    "code": "identity_conflict",
    "message": "The execution identity could not be reconciled to a principal."
  }
}
```

## Testnet Acceptance

The backend handoff is testnet-ready only when:

- Google and GitHub sign-ins both exchange into the same principal model used by current Authentik-backed flows.
- Repeated sign-ins map to the same principal instead of creating duplicates.
- Email/password sign-up can create a principal after verification without using Supabase-only metadata assumptions.
- Linked accounts are persisted outside direct UI/runtime RPC calls.
- The endpoint is observable enough to debug failed exchanges quickly.

## Observability Requirements

Log these events with stable fields:

- execution provider used
- provider user id hash or redacted identifier
- exchange success or failure
- principal id
- linked account upsert result
- provisioning event write result

## Current Gap

Today the package-side `AuthentikIssuerProvider` prefers the backend exchange URL when configured. The `dashboard-dev` deployment already mints issuer-owned JWTs through `POST /auth/exchange`; the local compatibility synthesis path remains only as a fallback when the backend runtime cannot mint issuer-owned tokens, and `AUTH_EXCHANGE_REQUIRE_ISSUER_OWNED=true` is the switch that retires the fallback for a given deployment.

That fallback behavior must be retired before Better Auth becomes the main execution path on testnet.
