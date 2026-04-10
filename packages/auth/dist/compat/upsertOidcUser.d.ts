import type { OidcClaims } from '@edcalderon/auth';
/**
 * Compatibility shim for legacy Authentik → Supabase provisioning flows.
 * New consumers should use the identity repository abstraction directly.
 */
export declare function upsertOidcUser(claims: OidcClaims, provider?: string): Promise<string>;
