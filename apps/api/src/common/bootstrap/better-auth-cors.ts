import type { FastifyReply } from 'fastify';

type BetterAuthRequestHeaderValue = string | string[] | number | undefined;
type BetterAuthRequestHeaders = Record<string, BetterAuthRequestHeaderValue>;

const BETTER_AUTH_ALLOWED_METHODS = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS';
const BETTER_AUTH_DEFAULT_ALLOWED_HEADERS =
  'content-type, authorization, x-requested-with, accept, origin';

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

export function applyBetterAuthCorsHeaders(
  reply: FastifyReply,
  requestHeaders: BetterAuthRequestHeaders,
  options: { preflight?: boolean } = {}
): void {
  const origin = normalizeHeaderValue(requestHeaders.origin) ?? '*';

  void reply.header('access-control-allow-origin', origin);
  void reply.header('access-control-allow-credentials', 'true');
  void reply.header('vary', appendVaryHeader(reply.getHeader('vary'), 'Origin'));

  if (!options.preflight) {
    return;
  }

  const requestedHeaders = normalizeHeaderValue(requestHeaders['access-control-request-headers']);
  void reply.header('access-control-allow-methods', BETTER_AUTH_ALLOWED_METHODS);
  void reply.header(
    'access-control-allow-headers',
    requestedHeaders ?? BETTER_AUTH_DEFAULT_ALLOWED_HEADERS
  );
  void reply.header('access-control-max-age', '86400');
}
