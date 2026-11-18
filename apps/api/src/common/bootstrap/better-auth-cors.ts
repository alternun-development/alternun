import type { FastifyReply } from 'fastify';

type BetterAuthRequestHeaderValue = string | string[] | number | undefined;
type BetterAuthRequestHeaders = Record<string, BetterAuthRequestHeaderValue>;

const BETTER_AUTH_ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
export const BETTER_AUTH_ALLOWED_HEADERS = [
  'content-type',
  'authorization',
  'x-requested-with',
  'accept',
  'origin',
] as const;

function normalizeHeaderValue(value: BetterAuthRequestHeaderValue): string | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(', ');
    return normalized.length > 0 ? normalized : undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function appendVaryHeader(existingValue: unknown, varyValue: string): string {
  const existing =
    typeof existingValue === 'string'
      ? existingValue
          .split(',')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : [];

  if (!existing.some((entry) => entry.toLowerCase() === varyValue.toLowerCase())) {
    existing.push(varyValue);
  }

  return existing.join(', ');
}

// No `null` on the way to Access-Control-Allow-Origin: CodeQL (js/cors-misconfiguration-for-
// credentials) treats a null that can reach that header as the dangerous "null" origin, even
// behind a falsy check. Internal helpers use `undefined`; the public resolver keeps `null`.
function normalizeOrigin(value: string): string | undefined {
  try {
    const origin = new URL(value).origin;
    return origin === 'null' ? undefined : origin;
  } catch {
    return undefined;
  }
}

/** The configured trusted origin that matches the request's Origin (the allowlist's own entry). */
function findTrustedOrigin(
  originValue: BetterAuthRequestHeaderValue,
  trustedOrigins: readonly string[]
): string | undefined {
  const requestOrigin = normalizeHeaderValue(originValue);
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : undefined;
  if (normalizedRequestOrigin === undefined) {
    return undefined;
  }

  return trustedOrigins
    .map((trustedOrigin) => normalizeOrigin(trustedOrigin))
    .find((trustedOrigin) => trustedOrigin === normalizedRequestOrigin);
}

export function resolveBetterAuthTrustedOrigin(
  originValue: BetterAuthRequestHeaderValue,
  trustedOrigins: readonly string[]
): string | null {
  return findTrustedOrigin(originValue, trustedOrigins) ?? null;
}

export function applyBetterAuthCorsHeaders(
  reply: FastifyReply,
  requestHeaders: BetterAuthRequestHeaders,
  trustedOrigins: readonly string[],
  options: { preflight?: boolean } = {}
): boolean {
  const origin = findTrustedOrigin(requestHeaders.origin, trustedOrigins);
  if (origin === undefined) {
    return false;
  }

  void reply.header('access-control-allow-origin', origin);
  void reply.header('access-control-allow-credentials', 'true');
  void reply.header('vary', appendVaryHeader(reply.getHeader('vary'), 'Origin'));

  if (!options.preflight) {
    return true;
  }

  void reply.header('access-control-allow-methods', BETTER_AUTH_ALLOWED_METHODS);
  void reply.header('access-control-allow-headers', BETTER_AUTH_ALLOWED_HEADERS.join(', '));
  void reply.header('access-control-max-age', '86400');
  return true;
}
