# SEC-05 — CORS: `origin: true, credentials: true` across the entire API

**Priority:** 🟡 MEDIUM — not immediately exploitable given current auth model; needs attention before scaling  
**Status:** Not started; pre-existing config, not introduced by the wallet work  
**Location:** `apps/api/src/common/bootstrap/create-app.ts`

```ts
app.enableCors({
  origin: true, // reflects ANY origin back in Access-Control-Allow-Origin
  credentials: true, // Access-Control-Allow-Credentials: true
});
```

---

## Why this matters

The combination of `origin: true` + `credentials: true` is an OWASP-flagged anti-pattern. The spec says that
`Access-Control-Allow-Credentials: true` **MUST NOT** be combined with a wildcard (`*`) origin — but Nest/Fastify
with `origin: true` instead reflects the request's `Origin` header verbatim, which achieves the same practical
result: any origin can make credentialed cross-origin requests.

### Is it currently exploitable for wallet endpoints?

**Not directly via classic CSRF**, because:

- Wallet endpoints use `Authorization: Bearer <token>` headers, not cookies.
- Browsers don't auto-attach `Authorization` headers cross-origin — the attacker's page would need to have JS
  access to the token to attach it.
- If JS on the attacker's page has the token, they already have full account access, regardless of CORS.

**But it is a broader risk**:

1. If any endpoint moves to cookie-based auth in future (e.g., Better Auth's session cookie), this CORS config
   immediately becomes a CSRF vector.
2. It means this API will send CORS headers that accept ANY origin with credentials — if a developer adds a
   `Set-Cookie` header somewhere (even unintentionally, via a framework feature), that cookie becomes usable
   cross-origin.
3. It fails standard security audits (OWASP ZAP, Burp Suite, automated pen-test tools).

---

## Recommended fix

Replace `origin: true` with an explicit allow-list tied to the app's known origins:

```ts
const ALLOWED_ORIGINS = [
  'https://airs.alternun.co',
  'https://testnet.airs.alternun.co',
  // add staging/local as needed:
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:8081', 'http://localhost:19006']
    : []),
];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
});
```

Alternatively, pull the allow-list from `SST_STAGE`/env to make it config-driven per environment.

---

## Files to change

- `apps/api/src/common/bootstrap/create-app.ts` — CORS config
- Possibly `packages/infra/` — ensure the allow-list env vars are provisioned per stage

## Coordination needed

This affects the entire API surface, not just the wallet module. Changing it could break any frontend that
currently sends cross-origin requests from an unlisted origin (including Expo Go dev sessions, which use a
localhost origin). Coordinate with whoever owns the frontend deployment config before changing.
