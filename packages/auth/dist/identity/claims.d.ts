import type { OidcClaims } from '@edcalderon/auth';
import type { ExternalIdentity } from '../core/types';
export declare function normalizeClaimString(value: unknown): string | undefined;
export declare function normalizeClaimBoolean(value: unknown): boolean | undefined;
export declare function normalizeExternalIdentity(identity: ExternalIdentity): ExternalIdentity;
export declare function claimsToRawIdentityClaims(
  claims: OidcClaims | Record<string, unknown>
): Record<string, unknown>;
export declare function claimsToExternalIdentity(
  provider: string,
  claims: OidcClaims | Record<string, unknown>,
  providerUserId?: string
): ExternalIdentity;
