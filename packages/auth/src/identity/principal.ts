import type { ExternalIdentity, Principal } from '../core/types';

export function resolvePrincipalRoles(rawClaims: Record<string, unknown>): string[] {
  const candidates = [
    rawClaims.alternun_roles,
    rawClaims.roles,
    rawClaims.role,
    rawClaims.app_roles,
  ];

  const roles = new Set<string>();
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (typeof entry === 'string' && entry.trim()) {
          roles.add(entry.trim());
        }
      }
      continue;
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      roles.add(candidate.trim());
    }
  }

  if (roles.size === 0) {
    roles.add('authenticated');
  }

  return Array.from(roles);
}

export function resolvePrincipalMetadata(
  identity: ExternalIdentity,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    emailVerified: identity.emailVerified ?? false,
    ...identity.rawClaims,
    ...extra,
  };
}

export function createPrincipalFromIdentity(input: {
  issuer: string;
  identity: ExternalIdentity;
  extraMetadata?: Record<string, unknown>;
}): Principal {
  return {
    issuer: input.issuer,
    subject: input.identity.providerUserId,
    email: input.identity.email,
    roles: resolvePrincipalRoles(input.identity.rawClaims),
    metadata: resolvePrincipalMetadata(input.identity, input.extraMetadata),
  };
}
