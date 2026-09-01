import {
  createHmac,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type AdminPermission = 'allowances:read' | 'allowances:write';

export const ADMIN_ROLES = [
  'platform_owner',
  'internal_admin',
  'partner_operator',
  'partner_readonly',
] as const;

export const ADMIN_PERMISSION_METADATA = 'admin-auth:permission';

export type AdminPrincipal = {
  iss: string;
  aud: string | readonly string[];
  sub: string;
  roles: readonly string[];
  organizationIds: readonly string[];
};

export type VerifyAccessToken = (
  authorization: string
) => Promise<AdminPrincipal | null | undefined>;

type RequirePermissionOptions = {
  permission: AdminPermission;
  organizationId: (request: FastifyRequest) => string | undefined;
};

export type AdminAuthGuardOptions = {
  expectedIssuer: string;
  expectedAudience: string;
  verifyAccessToken: VerifyAccessToken;
};

export type AdminJwtVerificationConfig = {
  issuer: string;
  audience: string;
  jwksUrl: string;
};

type VerifiedIssuerClaims = Record<string, unknown> & {
  aud: string | string[];
  exp: number;
  iat: number;
  iss: string;
  nbf: number;
  sub: string;
  token_use: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type ParsedJwt = {
  encodedHeader: string;
  encodedPayload: string;
  header: JwtHeader;
  claims: VerifiedIssuerClaims;
  signature: Buffer;
};

type Jwk = NodeJsonWebKey & {
  alg?: string;
  kid?: string;
  kty?: string;
  use?: string;
};

type JwksDocument = {
  keys?: Jwk[];
};

const permissionsByRole: Readonly<Record<string, readonly AdminPermission[]>> = {
  partner_readonly: ['allowances:read'],
  partner_operator: ['allowances:read', 'allowances:write'],
  internal_admin: ['allowances:read', 'allowances:write'],
  platform_owner: ['allowances:read', 'allowances:write'],
};
const knownAdminRoles = new Set<string>(ADMIN_ROLES);
const wildcardOrganizationId = '*';
const jwksCacheTtlMs = 5 * 60 * 1000;

export type FastifyAdminRequest = FastifyRequest & {
  adminPrincipal?: AdminPrincipal;
};

function readClaimArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function readRoleClaims(claims: Record<string, unknown>): string[] {
  return Array.from(
    new Set([
      ...readClaimArray(claims.roles),
      ...readClaimArray(claims.alternun_roles),
      ...readClaimArray(claims.role),
    ])
  );
}

function readOrganizationClaims(claims: Record<string, unknown>): string[] {
  return Array.from(
    new Set([
      ...readClaimArray(claims.organization_ids),
      ...readClaimArray(claims.alternun_organization_ids),
      ...readClaimArray(claims.organizationIds),
      ...readClaimArray(claims.org_ids),
      ...readClaimArray(claims.org_id),
    ])
  );
}

function isExpectedAudience(audience: AdminPrincipal['aud'], expectedAudience: string): boolean {
  return Array.isArray(audience)
    ? audience.includes(expectedAudience)
    : audience === expectedAudience;
}

export function hasPermission(principal: AdminPrincipal, permission: AdminPermission): boolean {
  return principal.roles.some((role) => permissionsByRole[role]?.includes(permission));
}

function hasKnownAdminRole(principal: AdminPrincipal): boolean {
  return principal.roles.some((role) => knownAdminRoles.has(role));
}

export function hasOrganizationScope(principal: AdminPrincipal, organizationId: string): boolean {
  return (
    principal.organizationIds.includes(wildcardOrganizationId) ||
    principal.organizationIds.includes(organizationId)
  );
}

function isBearerAuthorization(value: unknown): value is string {
  return typeof value === 'string' && /^Bearer\s+\S+$/i.test(value);
}

function normalizeBearerToken(authorization: string): string {
  return authorization.replace(/^Bearer\s+/i, '').trim();
}

function parseJwtPart<T extends Record<string, unknown>>(encodedValue: string, label: string): T {
  try {
    return JSON.parse(Buffer.from(encodedValue, 'base64url').toString('utf8')) as T;
  } catch {
    throw new Error(`Invalid ${label}.`);
  }
}

function readAudienceClaim(value: unknown): string | string[] {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const audience = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
    if (audience.length > 0) {
      return audience;
    }
  }

  throw new Error('Invalid JWT claims.');
}

function validateVerifiedClaims(claims: Record<string, unknown>): VerifiedIssuerClaims {
  const now = Math.floor(Date.now() / 1000);
  const audience = readAudienceClaim(claims.aud);

  if (
    typeof claims.exp !== 'number' ||
    typeof claims.nbf !== 'number' ||
    typeof claims.iat !== 'number' ||
    claims.exp <= now ||
    claims.nbf > now ||
    typeof claims.iss !== 'string' ||
    !claims.iss.trim() ||
    typeof claims.sub !== 'string' ||
    !claims.sub.trim() ||
    typeof claims.token_use !== 'string' ||
    !claims.token_use.trim()
  ) {
    throw new Error('Invalid JWT claims.');
  }

  return {
    ...claims,
    aud: audience,
    exp: claims.exp,
    iat: claims.iat,
    iss: claims.iss,
    nbf: claims.nbf,
    sub: claims.sub,
    token_use: claims.token_use,
  };
}

function parseJwt(token: string): ParsedJwt {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('JWT verification failed.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJwtPart<JwtHeader>(encodedHeader, 'JWT header');
  const claims = validateVerifiedClaims(
    parseJwtPart<Record<string, unknown>>(encodedPayload, 'JWT payload')
  );

  return {
    encodedHeader,
    encodedPayload,
    header,
    claims,
    signature: Buffer.from(encodedSignature, 'base64url'),
  };
}

function verifyHmacJwt(token: string, signingKey: string): VerifiedIssuerClaims {
  const parsed = parseJwt(token);
  if (parsed.header.alg !== 'HS256') {
    throw new Error('Unsupported JWT algorithm.');
  }

  const expectedSignature = createHmac('sha256', signingKey)
    .update(`${parsed.encodedHeader}.${parsed.encodedPayload}`)
    .digest();
  if (
    expectedSignature.length !== parsed.signature.length ||
    !timingSafeEqual(expectedSignature, parsed.signature)
  ) {
    throw new Error('JWT signature verification failed.');
  }

  return parsed.claims;
}

function isSupportedRsaJwk(jwk: Jwk): boolean {
  return (
    jwk.kty === 'RSA' &&
    (jwk.use === undefined || jwk.use === 'sig') &&
    (jwk.alg === undefined || jwk.alg === 'RS256') &&
    typeof jwk.n === 'string' &&
    typeof jwk.e === 'string'
  );
}

function selectJwk(keys: readonly Jwk[], kid: string | undefined): Jwk | null {
  const supportedKeys = keys.filter(isSupportedRsaJwk);
  if (supportedKeys.length === 0) {
    throw new Error('JWKS does not contain a supported signing key.');
  }

  if (kid) {
    return supportedKeys.find((entry) => entry.kid === kid) ?? null;
  }

  return supportedKeys.length === 1 ? supportedKeys[0] : null;
}

async function readJwksKeys(jwksUrl: string, fetchImpl: typeof fetch): Promise<Jwk[]> {
  const response = await fetchImpl(jwksUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch admin JWKS.');
  }

  const payload = (await response.json()) as JwksDocument | null;
  if (!payload || !Array.isArray(payload.keys)) {
    throw new Error('Invalid JWKS payload.');
  }

  return payload.keys;
}

function verifyJwksJwtSignature(parsed: ParsedJwt, jwk: Jwk): void {
  if (parsed.header.alg !== 'RS256') {
    throw new Error('Unsupported JWT algorithm.');
  }

  const publicKey = createPublicKey({ format: 'jwk', key: jwk as NodeJsonWebKey });
  const verified = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parsed.encodedHeader}.${parsed.encodedPayload}`, 'utf8'),
    publicKey,
    parsed.signature
  );
  if (!verified) {
    throw new Error('JWT signature verification failed.');
  }
}

export function resolveAdminJwtVerificationConfig(
  env: Record<string, string | undefined> = process.env
): AdminJwtVerificationConfig | null {
  const issuer = (env.ADMIN_AUTH_ISSUER ?? '').trim();
  const audience = (env.ADMIN_AUTH_AUDIENCE ?? '').trim();
  const jwksUrl = (env.ADMIN_AUTH_JWKS_URL ?? '').trim();

  if (!issuer || !audience || !jwksUrl) {
    return null;
  }

  return { issuer, audience, jwksUrl };
}

export function resolveAdminRuntimeOptions(
  env: Record<string, string | undefined> = process.env
): AdminAuthGuardOptions | null {
  const config = resolveAdminJwtVerificationConfig(env);
  if (!config) {
    return null;
  }

  return {
    expectedIssuer: config.issuer,
    expectedAudience: config.audience,
    verifyAccessToken: createRemoteJwksAdminVerifier(config.jwksUrl),
  };
}

/**
 * Compatibility helper for callers that already supply the dedicated issuer
 * and audience but have not yet renamed their JWKS setting. Nest production
 * routes use resolveAdminRuntimeOptions and therefore require ADMIN_AUTH_JWKS_URL.
 */
export function resolveRuntimeOptions(
  env: Record<string, string | undefined> = process.env
): AdminAuthGuardOptions | null {
  const strictOptions = resolveAdminRuntimeOptions(env);
  if (strictOptions) return strictOptions;

  const expectedIssuer = (env.ADMIN_AUTH_ISSUER ?? '').trim();
  const expectedAudience = (env.ADMIN_AUTH_AUDIENCE ?? '').trim();
  const jwksUrl = (env.AUTHENTIK_JWKS_URL ?? '').trim();
  if (!expectedIssuer || !expectedAudience || !jwksUrl) return null;

  return {
    expectedIssuer,
    expectedAudience,
    verifyAccessToken: createRemoteJwksAdminVerifier(jwksUrl),
  };
}

export async function authenticateAdminPrincipal(
  authorization: unknown,
  { expectedIssuer, expectedAudience, verifyAccessToken }: AdminAuthGuardOptions
): Promise<AdminPrincipal | 'forbidden' | null> {
  if (!isBearerAuthorization(authorization)) {
    return null;
  }

  let principal: AdminPrincipal | null | undefined;
  try {
    principal = await verifyAccessToken(authorization);
  } catch {
    throw new UnauthorizedException('Invalid or expired admin token.');
  }

  if (
    !principal?.sub ||
    principal.iss !== expectedIssuer ||
    !isExpectedAudience(principal.aud, expectedAudience)
  ) {
    return null;
  }

  if (!hasKnownAdminRole(principal)) {
    return 'forbidden';
  }

  return principal;
}

export function createIssuerJwtAdminVerifier(signingKey: string): VerifyAccessToken {
  const normalizedSigningKey = signingKey.trim();

  return (authorization: string): Promise<AdminPrincipal | null> => {
    if (!normalizedSigningKey) {
      return Promise.resolve(null);
    }

    const claims = verifyHmacJwt(normalizeBearerToken(authorization), normalizedSigningKey);
    if (claims.token_use !== 'access') {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      iss: claims.iss,
      aud: claims.aud,
      sub: claims.sub,
      roles: readRoleClaims(claims),
      organizationIds: readOrganizationClaims(claims),
    });
  };
}

export function createRemoteJwksAdminVerifier(
  jwksUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch
): VerifyAccessToken {
  const normalizedJwksUrl = jwksUrl.trim();
  let cachedKeys: Jwk[] | null = null;
  let cacheExpiresAt = 0;

  async function loadKeys(forceRefresh: boolean): Promise<Jwk[]> {
    const now = Date.now();
    if (!forceRefresh && cachedKeys && cacheExpiresAt > now) {
      return cachedKeys;
    }

    cachedKeys = await readJwksKeys(normalizedJwksUrl, fetchImpl);
    cacheExpiresAt = now + jwksCacheTtlMs;
    return cachedKeys;
  }

  return async (authorization: string): Promise<AdminPrincipal | null> => {
    if (!normalizedJwksUrl || typeof fetchImpl !== 'function') {
      return null;
    }

    const parsed = parseJwt(normalizeBearerToken(authorization));
    if (parsed.claims.token_use !== 'access') {
      return null;
    }

    let jwk = selectJwk(await loadKeys(false), parsed.header.kid);
    if (!jwk) {
      jwk = selectJwk(await loadKeys(true), parsed.header.kid);
    }
    if (!jwk) {
      throw new Error('Unable to resolve admin signing key.');
    }

    verifyJwksJwtSignature(parsed, jwk);

    return {
      iss: parsed.claims.iss,
      aud: parsed.claims.aud,
      sub: parsed.claims.sub,
      roles: readRoleClaims(parsed.claims),
      organizationIds: readOrganizationClaims(parsed.claims),
    };
  };
}

/**
 * Creates the Fastify authorization boundary for admin routes. The verifier is
 * responsible for cryptographically validating the token; this guard only uses
 * the verified principal it returns.
 */
export function createAdminAuthGuard({
  expectedIssuer,
  expectedAudience,
  verifyAccessToken,
}: AdminAuthGuardOptions) {
  async function authenticate(
    request: FastifyAdminRequest,
    reply: FastifyReply
  ): Promise<AdminPrincipal | null> {
    let principal: AdminPrincipal | 'forbidden' | null;
    try {
      principal = await authenticateAdminPrincipal(request.headers.authorization, {
        expectedIssuer,
        expectedAudience,
        verifyAccessToken,
      });
    } catch {
      await reply.code(401).send();
      return null;
    }
    if (principal === 'forbidden') {
      await reply.code(403).send();
      return null;
    }

    if (!principal) {
      await reply.code(401).send();
      return null;
    }

    request.adminPrincipal = principal;
    return principal;
  }

  return {
    requireAuthenticated() {
      return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        await authenticate(request as FastifyAdminRequest, reply);
      };
    },
    requirePermission({ permission, organizationId }: RequirePermissionOptions) {
      return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const principal = await authenticate(request as FastifyAdminRequest, reply);
        if (!principal) {
          return;
        }

        const targetOrganizationId = organizationId(request);
        if (
          !hasPermission(principal, permission) ||
          !targetOrganizationId ||
          !hasOrganizationScope(principal, targetOrganizationId)
        ) {
          await reply.code(403).send();
          return;
        }
      };
    },
  };
}
