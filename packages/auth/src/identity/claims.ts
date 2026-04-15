import type { OidcClaims } from '@edcalderon/auth';
import type { ExternalIdentity } from '../core/types';

export function normalizeClaimString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeClaimBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
}

export function normalizeExternalIdentity(identity: ExternalIdentity): ExternalIdentity {
  return {
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    email: normalizeClaimString(identity.email),
    emailVerified: normalizeClaimBoolean(identity.emailVerified),
    displayName: normalizeClaimString(identity.displayName),
    avatarUrl: normalizeClaimString(identity.avatarUrl),
    rawClaims: identity.rawClaims ?? {},
  };
}

export function claimsToRawIdentityClaims(
  claims: OidcClaims | Record<string, unknown>
): Record<string, unknown> {
  return { ...(claims as Record<string, unknown>) };
}

export function claimsToExternalIdentity(
  provider: string,
  claims: OidcClaims | Record<string, unknown>,
  providerUserId?: string
): ExternalIdentity {
  const rawClaims = claimsToRawIdentityClaims(claims);
  const subject = normalizeClaimString(rawClaims.sub) ?? providerUserId ?? provider;

  return normalizeExternalIdentity({
    provider,
    providerUserId: subject,
    email: normalizeClaimString(rawClaims.email),
    emailVerified: normalizeClaimBoolean(rawClaims.email_verified),
    displayName:
      normalizeClaimString(rawClaims.name) ??
      normalizeClaimString(rawClaims.preferred_username) ??
      normalizeClaimString(rawClaims.given_name) ??
      normalizeClaimString(rawClaims.family_name),
    avatarUrl: normalizeClaimString(rawClaims.picture),
    rawClaims,
  });
}
