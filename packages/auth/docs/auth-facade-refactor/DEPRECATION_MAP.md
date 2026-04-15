# Supabase Deprecation Map

## Direct Assumptions Being Removed

| Old Assumption                                          | New Home                            | Current Status                           |
| ------------------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| Supabase is the auth executor                           | `AuthExecutionProvider`             | Isolated, but still default              |
| Supabase is the issuer                                  | `IdentityIssuerProvider`            | Isolated, but legacy bridge still exists |
| `supabase.auth.updateUser({ data })` stores authz state | principal / projection repository   | Still needs app cleanup                  |
| `public.user_wallets` is the wallet source of truth     | wallet linkage adapter / repository | Not migrated yet                         |
| `upsert_oidc_user` is called directly from UI/runtime   | compatibility shim / repository     | Partially isolated, still active         |
| Auth env parsing lives in feature code                  | runtime config adapter              | Implemented                              |

## Current Compatibility Paths

- `SupabaseExecutionProvider`
- `SupabaseLegacyIssuerProvider`
- `SupabaseIdentityRepository`
- `SupabaseEmailProvider`
- `upsertCompatOidcUser`
- `AlternunMobileAuthClient`

## Removal Gates

Do not remove legacy Supabase behavior until all of these are true:

1. Better Auth is the execution default on testnet.
2. `POST /auth/exchange` is live and stable.
3. Linked account persistence is real, not placeholder-only.
4. Wallet linkage is app-owned.
5. Email verification and password reset are no longer Supabase-script dependent.

## Recommended Removal Order

1. Stop new code from depending on Supabase user metadata.
2. Replace direct `upsert_oidc_user` assumptions with the backend exchange and repository model.
3. Move wallet writes into the repository abstraction.
4. Route email/template flow through email providers.
5. Keep Supabase execution only as a rollback fallback.
6. Remove legacy Supabase execution after Better Auth plus Authentik exchange is stable in testnet.
