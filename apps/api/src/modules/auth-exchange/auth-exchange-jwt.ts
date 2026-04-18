import { createHmac, timingSafeEqual, randomUUID, } from 'node:crypto';
import type { AuthExchangePrincipal, } from './auth-exchange.mapper';

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

export interface VerifiedIssuerJwtResult {
  header: {
    alg?: string;
    typ?: string;
    kid?: string;
  };
  claims: AuthExchangeJwtClaims;
}

function encodeBase64Url(value: string,): string {
  return Buffer.from(value, 'utf8',).toString('base64url',);
}

function decodeBase64Url(value: string,): string {
  return Buffer.from(value, 'base64url',).toString('utf8',);
}

function encodeJsonBase64Url(value: Record<string, unknown>,): string {
  return encodeBase64Url(JSON.stringify(value,),);
}

function signBase64Url(input: string, signingKey: string,): string {
  return createHmac('sha256', signingKey,).update(input,).digest('base64url',);
}

function toBuffer(value: string,): Buffer {
  return Buffer.from(value, 'utf8',);
}

function readJson<T>(value: string, label: string,): T {
  try {
    return JSON.parse(value,) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error,);
    throw new Error(`Invalid ${label}: ${reason}`,);
  }
}

function validateJwtClaims(claims: Record<string, unknown>,): AuthExchangeJwtClaims {
  const principalId =
    typeof claims.principal_id === 'string' && claims.principal_id.trim().length > 0
      ? claims.principal_id.trim()
      : null;

  if (!principalId) {
    throw new Error('Invalid JWT claims: missing principal_id',);
  }

  const appUserId =
    typeof claims.app_user_id === 'string' && claims.app_user_id.trim().length > 0
      ? claims.app_user_id.trim()
      : null;

  const tokenUse = claims.token_use;
  if (tokenUse !== 'access' && tokenUse !== 'id') {
    throw new Error('Invalid JWT claims: missing token_use',);
  }

  if (typeof claims.iss !== 'string' || claims.iss.trim().length === 0) {
    throw new Error('Invalid JWT claims: missing iss',);
  }

  if (typeof claims.sub !== 'string' || claims.sub.trim().length === 0) {
    throw new Error('Invalid JWT claims: missing sub',);
  }

  if (typeof claims.aud !== 'string' || claims.aud.trim().length === 0) {
    throw new Error('Invalid JWT claims: missing aud',);
  }

  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp,)) {
    throw new Error('Invalid JWT claims: missing exp',);
  }

  if (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf,)) {
    throw new Error('Invalid JWT claims: missing nbf',);
  }

  if (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat,)) {
    throw new Error('Invalid JWT claims: missing iat',);
  }

  if (!Array.isArray(claims.roles,) || !Array.isArray(claims.alternun_roles,)) {
    throw new Error('Invalid JWT claims: missing roles',);
  }

  return {
    iss: claims.iss,
    sub: claims.sub,
    aud: claims.aud,
    email: typeof claims.email === 'string' ? claims.email : null,
    email_verified: Boolean(claims.email_verified,),
    iat: claims.iat,
    nbf: claims.nbf,
    exp: claims.exp,
    roles: claims.roles.filter((entry,): entry is string => typeof entry === 'string',),
    alternun_roles: claims.alternun_roles.filter(
      (entry,): entry is string => typeof entry === 'string',
    ),
    principal_id: principalId,
    app_user_id: appUserId,
    token_use: tokenUse,
    auth_time: typeof claims.auth_time === 'number' ? claims.auth_time : undefined,
  };
}

export function verifyIssuerJwt(token: string, signingKey: string,): VerifiedIssuerJwtResult {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('JWT verification failed: token is empty',);
  }

  const parts = trimmedToken.split('.',);
  if (parts.length !== 3) {
    throw new Error('JWT verification failed: expected three token segments',);
  }

  const [encodedHeader, encodedPayload, encodedSignature,] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signBase64Url(signingInput, signingKey,);

  if (expectedSignature.length !== encodedSignature.length) {
    throw new Error('JWT verification failed: signature mismatch',);
  }

  const actualSignatureBuffer = toBuffer(encodedSignature,);
  const expectedSignatureBuffer = toBuffer(expectedSignature,);
  if (
    actualSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(actualSignatureBuffer, expectedSignatureBuffer,)
  ) {
    throw new Error('JWT verification failed: signature mismatch',);
  }

  const header = readJson<Record<string, unknown>>(decodeBase64Url(encodedHeader,), 'JWT header',);
  const payload = readJson<Record<string, unknown>>(decodeBase64Url(encodedPayload,), 'JWT payload',);

  if (header.alg !== 'HS256') {
    throw new Error(`JWT verification failed: unsupported algorithm ${String(header.alg,)}`,);
  }

  const now = Math.floor(Date.now() / 1000,);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('JWT verification failed: token expired',);
  }

  if (typeof payload.nbf === 'number' && payload.nbf > now) {
    throw new Error('JWT verification failed: token not yet valid',);
  }

  return {
    header: {
      alg: typeof header.alg === 'string' ? header.alg : undefined,
      typ: typeof header.typ === 'string' ? header.typ : undefined,
      kid: typeof header.kid === 'string' ? header.kid : undefined,
    },
    claims: validateJwtClaims(payload,),
  };
}

function normalizeRoles(value: unknown,): string[] {
  if (!Array.isArray(value,)) {
    return ['authenticated',];
  }

  const roles = value
    .map((entry,) => (typeof entry === 'string' ? entry.trim() : ''),)
    .filter((entry,) => entry.length > 0,);

  return roles.length > 0 ? roles : ['authenticated',];
}

export function mintIssuerJwt(input: MintIssuerJwtInput,): MintIssuerJwtResult {
  const issuedAt = input.issuedAt ?? new Date();
  const iat = Math.floor(issuedAt.getTime() / 1000,);
  const exp = iat + (input.expiresInSeconds ?? 60 * 15);
  const claims: AuthExchangeJwtClaims = {
    iss: input.issuer,
    sub: input.principal.subject,
    aud: input.audience,
    email: input.principal.email ?? null,
    email_verified: Boolean(input.principal.metadata.emailVerified,),
    iat,
    nbf: iat,
    exp,
    roles: normalizeRoles(input.principal.roles,),
    alternun_roles: normalizeRoles(input.principal.roles,),
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

  const encodedHeader = encodeJsonBase64Url(header,);
  const encodedPayload = encodeJsonBase64Url(claims as unknown as Record<string, unknown>,);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signBase64Url(signingInput, input.signingKey,);

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: exp,
    claims,
  };
}

export function mintIssuerAccessToken(
  input: Omit<MintIssuerJwtInput, 'tokenUse'>,
): MintIssuerJwtResult {
  return mintIssuerJwt({
    ...input,
    tokenUse: 'access',
  },);
}

export function mintIssuerIdToken(
  input: Omit<MintIssuerJwtInput, 'tokenUse'>,
): MintIssuerJwtResult {
  return mintIssuerJwt({
    ...input,
    tokenUse: 'id',
  },);
}

export function generateIssuerRefreshToken(seed: string,): string {
  return createHmac('sha256', seed,)
    .update(`${seed}:${randomUUID()}:${Date.now()}`,)
    .digest('base64url',);
}
