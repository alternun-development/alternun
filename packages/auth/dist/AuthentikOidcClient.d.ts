/**
 * Alternun Authentik → Supabase bridge.
 *
 * The full Authentik OIDC client (PKCE flow, token exchange, session storage)
 * now lives in `@edcalderon/auth`. This file provides only the Supabase side:
 * upserting the authenticated OIDC user into `public.users` via the
 * `upsert_oidc_user` SECURITY DEFINER RPC.
 */
import type { OidcClaims } from '@edcalderon/auth';
/**
 * Upserts an Authentik OIDC user into the Supabase `public.users` table
 * via the `upsert_oidc_user` SECURITY DEFINER RPC.
 * Returns the Supabase user UUID.
 */
export declare function upsertOidcUser(claims: OidcClaims, provider?: string): Promise<string>;
