# Backend Handoff Contract

## Purpose

`POST /auth/exchange` is the missing production contract between the Better Auth execution layer and the canonical Alternun issuer session.

Without this endpoint, `packages/auth` can only simulate the issuer session locally. That is good enough for package tests and adapter wiring, but not good enough for real testnet rollout.

The package calls `AUTH_EXCHANGE_URL` when it is configured, which means the backend exchange path is already part of the runtime graph. The backend verifies the execution session before reconciliation and only returns issuer-owned JWTs. If `AUTHENTIK_JWT_SIGNING_KEY` is unavailable, the exchange fails closed with `503`; an execution-layer token is never returned as the final Alternun session.

## Required Endpoint

`POST /auth/exchange`

This endpoint must:

1. verify the request credential with the execution provider
2. compare the normalized body identity with the verified identity
3. reconcile that verified identity against Alternun principals and linked accounts
4. create the canonical issuer session
5. return the issuer session payload used by apps, including `exchangeMode`

## Request Contract

The request must carry its execution credential outside the JSON body:

- `Authorization: Bearer <token>` for Better Auth bearer sessions or Supabase access tokens
- the Better Auth session cookie may also be forwarded with `credentials: 'include'`

Tokens embedded in `executionSession` or `context` do not authenticate the request. The server verifies Supabase bearers with `/auth/v1/user` and Better Auth sessions with `/auth/get-session`, using bounded requests that fail closed.

### Supported fields

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

### Temporarily accepted legacy fields

Older clients may also send `claims`, `redirectTo`, and `context.authExchangeUrl`. These fields are
deprecated, strictly validated, and ignored by the server. They are not used to authenticate the
request, select the audience, define the external identity, or create issuer tokens. Undeclared
fields remain rejected.

- `claims`: optional object
- `redirectTo`: optional string, maximum 2048 characters
- `context.authExchangeUrl`: optional string, maximum 2048 characters

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
- Do not accept issuer-owned access or ID tokens as proof for another exchange.
- Do not trust body claims, audience, email verification state, or embedded session tokens.
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
- `exchangeMode` is `issuer-owned`; compatibility fallback is not a valid final exchange result
- a missing issuer signing key always returns `503`, regardless of the rollout flag

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

## Compatibility Gaps And Deployment Gate

Better Auth currently exposes its internal `user.id` as the package-side `providerUserId`. The server therefore compares that value with the verified session user id to prevent one user from claiming another user's identity. Correct provider semantics would use the linked account's `providerId/accountId`, but changing that value would change existing principal ids because the principal is derived from issuer, provider, and provider user id. Moving to the linked-account id is separate work and requires an identity migration plan.

The package also normalizes Better Auth sessions with `google` as the default provider. A Discord session can therefore be labelled as Google when the session response has no explicit provider. Until the client supplies reliable linked-account provider data, the server accepts only the known labels `google`, `discord`, `email`, and `github`, but cannot verify which one belongs to the session. A user with a valid session can therefore obtain one identity per allowed provider. It still requires a valid session, exact `providerUserId === session.user.id`, and a normalized email match, and it uses `emailVerified` from the verified session.

Wallet-only labels such as `wallet:metamask` and `wallet:walletconnect` are not accepted by the exchange while the server requires a Better Auth or Supabase session, so wallet-only users do not receive an issuer token from this endpoint. Wallet-only mode is disabled by default with `EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH=false`.

The existing client does not yet send the exchange credential in the request headers. The client follow-up must send `Authorization: Bearer <execution token>` and use `credentials: 'include'` so a Better Auth cookie can be forwarded where applicable. **This server change must not be deployed until that client change is available.**
