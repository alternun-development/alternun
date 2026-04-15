import { createHash } from 'node:crypto';

export interface AuthExchangeExternalIdentity {
  provider: string;
  providerUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
  rawClaims?: Record<string, unknown>;
}

export interface AuthExchangeExecutionSession {
  provider: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresAt?: number | null;
  linkedAccounts?: Array<Record<string, unknown>>;
}

export interface AuthExchangeContext {
  trigger?: string;
  runtime?: string;
  app?: string;
  audience?: string;
  issuerAccessToken?: string | null;
  issuerRefreshToken?: string | null;
  issuerIdToken?: string | null;
  issuerExpiresAt?: number | null;
}

export interface AuthExchangeRequestShape {
  externalIdentity: AuthExchangeExternalIdentity;
  executionSession?: AuthExchangeExecutionSession;
  context?: AuthExchangeContext;
}

export interface AuthExchangePrincipal {
  issuer: string;
  subject: string;
  email: string | null;
  roles: string[];
  metadata: Record<string, unknown>;
}

export interface AuthExchangeLinkedAccount {
  provider: string;
  providerUserId: string;
  type: 'social' | 'password' | 'wallet' | 'oidc' | 'email';
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthExchangeResponseShape {
  issuerAccessToken: string;
  issuerRefreshToken: string | null;
  issuerIdToken: string | null;
  issuerExpiresAt: number | null;
  principal: AuthExchangePrincipal;
  linkedAccounts: AuthExchangeLinkedAccount[];
  claims: Record<string, unknown>;
  appUserId: string | null;
  exchangeMode: 'compatibility' | 'issuer-owned';
  syncStatus: 'synced' | 'skipped';
}

function createStableUuid(input: string): string {
  const hash = createHash('sha256').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, '0')}${hash.slice(18, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

export function canonicalIssuerFromEnv(
  env: Record<string, string | undefined> = process.env
): string {
  return (
    firstNonEmptyTrimmed([env.AUTHENTIK_ISSUER, env.EXPO_PUBLIC_AUTHENTIK_ISSUER]) ??
    'https://auth.alternun.co/application/o/alternun-mobile/'
  );
}

export function defaultAudienceFromEnv(
  env: Record<string, string | undefined> = process.env
): string {
  return firstNonEmptyTrimmed([env.AUTH_AUDIENCE]) ?? 'alternun-app';
}

export function buildCompatOidcPayload(input: {
  sub: string;
  iss: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
  rawClaims?: Record<string, unknown>;
}): { principalId: string; payload: Record<string, unknown> } {
  const principalId = createStableUuid(`${input.iss}:${input.sub}`);
  const claims = {
    sub: input.sub,
    iss: input.iss,
    email: input.email ?? null,
    email_verified: Boolean(input.emailVerified),
    name: input.name ?? null,
    picture: input.picture ?? null,
    ...(input.rawClaims ?? {}),
  };

  return {
    principalId,
    payload: {
      p_sub: principalId,
      p_iss: input.iss,
      p_email: claims.email ?? null,
      p_email_verified: claims.email_verified ?? false,
      p_name: input.name ?? null,
      p_picture: input.picture ?? null,
      p_provider: input.provider ?? null,
      p_raw_claims: claims,
    },
  };
}

export function normalizeLinkedAccountType(provider: string): AuthExchangeLinkedAccount['type'] {
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'email' || normalized === 'password') {
    return 'password';
  }

  if (normalized === 'wallet') {
    return 'wallet';
  }

  if (normalized === 'oidc' || normalized === 'authentik') {
    return 'oidc';
  }

  return 'social';
}

export function createExchangePrincipal(
  issuer: string,
  externalIdentity: AuthExchangeExternalIdentity,
  appUserId: string | null,
  metadata: Record<string, unknown> = {}
): AuthExchangePrincipal {
  const subject = createStableUuid(
    `${issuer}:${externalIdentity.provider}:${externalIdentity.providerUserId}`
  );

  return {
    issuer,
    subject,
    email: externalIdentity.email ?? null,
    roles: ['authenticated'],
    metadata: {
      appUserId,
      provider: externalIdentity.provider,
      providerUserId: externalIdentity.providerUserId,
      emailVerified: Boolean(externalIdentity.emailVerified),
      displayName: externalIdentity.displayName ?? null,
      avatarUrl: externalIdentity.avatarUrl ?? null,
      rawClaims: externalIdentity.rawClaims ?? {},
      ...metadata,
    },
  };
}

export function createExchangeClaims(input: {
  issuer: string;
  principal: AuthExchangePrincipal;
  audience: string;
  issuedAt: Date;
  expiresInSeconds?: number;
}): Record<string, unknown> {
  const iat = Math.floor(input.issuedAt.getTime() / 1000);
  const exp = iat + (input.expiresInSeconds ?? 60 * 60);

  return {
    iss: input.issuer,
    sub: input.principal.subject,
    aud: input.audience,
    email: input.principal.email,
    email_verified: Boolean(input.principal.metadata.emailVerified),
    iat,
    nbf: iat,
    exp,
    roles: input.principal.roles,
    alternun_roles: input.principal.roles,
  };
}

export function createExchangeResponse(input: {
  issuer: string;
  audience: string;
  externalIdentity: AuthExchangeExternalIdentity;
  executionSession?: AuthExchangeExecutionSession;
  issuerSession?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    expiresAt?: number | null;
  };
  appUserId: string | null;
  syncStatus: 'synced' | 'skipped';
  metadata?: Record<string, unknown>;
  issuedAt?: Date;
}): AuthExchangeResponseShape {
  const issuedAt = input.issuedAt ?? new Date();
  const principal = createExchangePrincipal(
    input.issuer,
    input.externalIdentity,
    input.appUserId,
    input.metadata
  );
  const claims = createExchangeClaims({
    issuer: input.issuer,
    principal,
    audience: input.audience,
    issuedAt,
  });
  const linkedAccount = {
    provider: input.externalIdentity.provider,
    providerUserId: input.externalIdentity.providerUserId,
    type: normalizeLinkedAccountType(input.externalIdentity.provider),
    email: input.externalIdentity.email ?? null,
    displayName: input.externalIdentity.displayName ?? null,
    avatarUrl: input.externalIdentity.avatarUrl ?? null,
  } satisfies AuthExchangeLinkedAccount;

  return {
    issuerAccessToken:
      input.issuerSession?.accessToken ?? input.executionSession?.accessToken ?? '',
    issuerRefreshToken:
      input.issuerSession?.refreshToken ?? input.executionSession?.refreshToken ?? null,
    issuerIdToken: input.issuerSession?.idToken ?? input.executionSession?.idToken ?? null,
    issuerExpiresAt: input.issuerSession?.expiresAt ?? input.executionSession?.expiresAt ?? null,
    principal,
    linkedAccounts: [linkedAccount],
    claims: {
      ...claims,
      principal_id: principal.subject,
    },
    appUserId: input.appUserId,
    exchangeMode: 'compatibility',
    syncStatus: input.syncStatus,
  };
}
