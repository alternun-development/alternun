import type { OidcClaims, User } from '@edcalderon/auth';
import type {
  AlternunSession,
  ExecutionSession,
  ExternalIdentity,
  IssuerSession,
  LinkedAuthAccount,
  Principal,
} from './types';

export function createAlternunSession(input: {
  issuerSession: IssuerSession;
  executionSession?: ExecutionSession | null;
}): AlternunSession {
  return {
    issuerAccessToken: input.issuerSession.accessToken,
    issuerRefreshToken: input.issuerSession.refreshToken ?? null,
    executionSession: input.executionSession ?? null,
    principal: input.issuerSession.principal,
    linkedAccounts: input.issuerSession.linkedAccounts,
  };
}

export function principalToUser(
  principal: Principal,
  overrides: {
    id?: string;
    avatarUrl?: string;
    provider?: string;
    providerUserId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): User {
  return {
    id: overrides.id ?? principal.subject,
    email: principal.email,
    avatarUrl: overrides.avatarUrl,
    provider: overrides.provider,
    providerUserId: overrides.providerUserId,
    roles: principal.roles,
    metadata: {
      ...principal.metadata,
      ...(overrides.metadata ?? {}),
    },
  };
}

export function executionSessionToUser(
  session: ExecutionSession | null,
  fallbackPrincipal?: Principal | null
): User | null {
  if (!session) {
    return fallbackPrincipal ? principalToUser(fallbackPrincipal) : null;
  }

  const identity = session.externalIdentity;
  if (identity) {
    return {
      id: identity.providerUserId,
      email: identity.email,
      avatarUrl: identity.avatarUrl,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      metadata: {
        ...identity.rawClaims,
      },
    };
  }

  if (fallbackPrincipal) {
    return principalToUser(fallbackPrincipal, {
      provider: session.provider,
      providerUserId: session.raw.providerUserId as string | undefined,
      metadata: session.raw,
    });
  }

  return null;
}

export function issuerSessionToUser(
  session: IssuerSession | null,
  fallbackExecution?: ExecutionSession | null
): User | null {
  if (!session) {
    return executionSessionToUser(fallbackExecution ?? null);
  }

  return principalToUser(session.principal, {
    id: session.principal.subject,
    provider: fallbackExecution?.provider,
    providerUserId: fallbackExecution?.externalIdentity?.providerUserId,
    metadata: {
      claims: session.claims,
      executionProvider: fallbackExecution?.provider,
    },
  });
}

export function buildLinkedAccountsFromIdentity(
  identity: ExternalIdentity,
  type: LinkedAuthAccount['type'] = 'oidc'
): LinkedAuthAccount[] {
  return [
    {
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      type,
      email: identity.email,
      displayName: identity.displayName,
      metadata: {
        emailVerified: identity.emailVerified ?? false,
        ...identity.rawClaims,
      },
    },
  ];
}

export function claimsToExternalIdentity(
  provider: string,
  claims: OidcClaims | Record<string, unknown>,
  providerUserId?: string
): ExternalIdentity {
  const rawClaims = claims as Record<string, unknown>;
  const resolvedProviderUserId =
    providerUserId ??
    (typeof rawClaims.sub === 'string' ? rawClaims.sub : undefined) ??
    (typeof rawClaims.providerUserId === 'string' ? rawClaims.providerUserId : undefined) ??
    provider;

  return {
    provider,
    providerUserId: resolvedProviderUserId,
    email: typeof rawClaims.email === 'string' ? rawClaims.email : undefined,
    emailVerified:
      typeof rawClaims.email_verified === 'boolean' ? rawClaims.email_verified : undefined,
    displayName:
      typeof rawClaims.name === 'string'
        ? rawClaims.name
        : typeof rawClaims.preferred_username === 'string'
        ? rawClaims.preferred_username
        : undefined,
    avatarUrl: typeof rawClaims.picture === 'string' ? rawClaims.picture : undefined,
    rawClaims,
  };
}
