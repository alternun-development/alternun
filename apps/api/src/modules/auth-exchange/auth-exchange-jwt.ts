import { createHmac, randomUUID } from 'node:crypto';
import type { AuthExchangePrincipal } from './auth-exchange.mapper';

export interface AuthExchangeJwtClaims {
  iss: string;
  sub: string;
  aud: string;
  email: string | null;
  email_verified: boolean;
  iat: number;
  nbf: number;
  exp: number;
  roles: string[];
  alternun_roles: string[];
  principal_id: string;
  app_user_id: string | null;
  token_use: 'access' | 'id';
  auth_time?: number;
}

export interface MintIssuerJwtInput {
  issuer: string;
  audience: string;
  principal: AuthExchangePrincipal;
  claims: Record<string, unknown>;
  signingKey: string;
  issuedAt?: Date;
  expiresInSeconds?: number;
  tokenUse: 'access' | 'id';
}

export interface MintIssuerJwtResult {
  token: string;
  expiresAt: number;
  claims: AuthExchangeJwtClaims;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function encodeJsonBase64Url(value: Record<string, unknown>): string {
  return encodeBase64Url(JSON.stringify(value));
}

function signBase64Url(input: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(input).digest('base64url');
}

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return ['authenticated'];
  }

  const roles = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);

  return roles.length > 0 ? roles : ['authenticated'];
}

export function mintIssuerJwt(input: MintIssuerJwtInput): MintIssuerJwtResult {
  const issuedAt = input.issuedAt ?? new Date();
  const iat = Math.floor(issuedAt.getTime() / 1000);
  const exp = iat + (input.expiresInSeconds ?? 60 * 15);
  const claims: AuthExchangeJwtClaims = {
    iss: input.issuer,
    sub: input.principal.subject,
    aud: input.audience,
    email: input.principal.email ?? null,
    email_verified: Boolean(input.principal.metadata.emailVerified),
    iat,
    nbf: iat,
    exp,
    roles: normalizeRoles(input.principal.roles),
    alternun_roles: normalizeRoles(input.principal.roles),
    principal_id: input.principal.subject,
    app_user_id:
      typeof input.principal.metadata.appUserId === 'string'
        ? input.principal.metadata.appUserId
        : null,
    token_use: input.tokenUse,
    auth_time: iat,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: 'alternun-auth',
  } satisfies Record<string, unknown>;

  const encodedHeader = encodeJsonBase64Url(header);
  const encodedPayload = encodeJsonBase64Url(claims as unknown as Record<string, unknown>);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signBase64Url(signingInput, input.signingKey);

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: exp,
    claims,
  };
}

export function mintIssuerAccessToken(
  input: Omit<MintIssuerJwtInput, 'tokenUse'>
): MintIssuerJwtResult {
  return mintIssuerJwt({
    ...input,
    tokenUse: 'access',
  });
}

export function mintIssuerIdToken(
  input: Omit<MintIssuerJwtInput, 'tokenUse'>
): MintIssuerJwtResult {
  return mintIssuerJwt({
    ...input,
    tokenUse: 'id',
  });
}

export function generateIssuerRefreshToken(seed: string): string {
  return createHmac('sha256', seed)
    .update(`${seed}:${randomUUID()}:${Date.now()}`)
    .digest('base64url');
}
