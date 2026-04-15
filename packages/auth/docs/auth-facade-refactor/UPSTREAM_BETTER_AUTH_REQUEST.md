# Upstream Request for `@edcalderon/auth`

## Summary

Alternun needs `@edcalderon/auth` to stay the public `AuthClient` / `AuthProvider` surface while gaining a first-class Better Auth execution path for social login.

This is a compatibility request, not a fork request.

## Why

- Better Auth should handle execution flows such as Google, GitHub, and Apple placeholder.
- Email/password should remain independently swappable so Alternun can keep a legacy-compatible execution path during migration.
- Authentik should remain the canonical issuer / token authority.
- The package should not require Alternun to own a parallel auth stack long-term.

## Requested Shape

- Keep `AuthClient`, `AuthProvider`, and `useAuth`
- Add Better Auth execution support behind the existing client contract
- Preserve social sign-in ergonomics and keep email/password compatible through a separate execution adapter
- Keep callback/session helpers composable so issuer exchange can remain externalized

## Current Alternun Integration Points

These are the current compatibility surfaces Alternun depends on:

- `packages/auth/src/mobile/AlternunMobileAuthClient.ts`
- `packages/auth/src/mobile/AppAuthProvider.tsx`
- `packages/auth/src/mobile/authentikPreset.ts`
- `packages/auth/src/mobile/authentikClient.ts`
- `packages/auth/src/mobile/runtimeSignIn.ts`

## Examples

### Google sign-in

```ts
await client.signIn({ provider: 'google', flow: 'redirect' });
```

### Email/password sign-up

```ts
const result = await client.signUpWithEmail('ada@example.com', 'password123');
if (result.needsEmailVerification) {
  // show confirmation UI
}
```

### Canonical issuer exchange

```ts
const session = await exchangeIdentity({
  externalIdentity,
  executionSession,
});
```

## Acceptance Criteria for Upstream

- Better Auth can be used as the execution engine without changing the app-facing API.
- Authentik remains the issuer boundary.
- Supabase-specific persistence remains optional and isolated.
- Existing `AuthClient` consumers do not need a rewrite.

## Reference

Alternun’s current compatibility wrapper lives in `packages/auth` and is intentionally being reduced to a facade layer.
