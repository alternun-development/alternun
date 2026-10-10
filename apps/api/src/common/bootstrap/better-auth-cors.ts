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

function normalizeHeaderValue(value: BetterAuthRequestHeaderValue): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .join(', ');
    return normalized.length > 0 ? normalized : null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function normalizeOrigin(value: string): string | null {
  try {
    const origin = new URL(value).origin;
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

export function resolveBetterAuthTrustedOrigin(
  originValue: BetterAuthRequestHeaderValue,
  trustedOrigins: readonly string[]
): string | null {
  const requestOrigin = normalizeHeaderValue(originValue);
  if (!requestOrigin) {
    return null;
  }

  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedRequestOrigin) {
    return null;
  }

  return trustedOrigins.some(
    (trustedOrigin) => normalizeOrigin(trustedOrigin) === normalizedRequestOrigin
  )
    ? normalizedRequestOrigin
    : null;
}

export function applyBetterAuthCorsHeaders(
  reply: FastifyReply,
  requestHeaders: BetterAuthRequestHeaders,
  trustedOrigins: readonly string[],
  options: { preflight?: boolean } = {}
): boolean {
  const origin = resolveBetterAuthTrustedOrigin(requestHeaders.origin, trustedOrigins);
  if (!origin) {
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
