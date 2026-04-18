import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { applyBetterAuthCorsHeaders } from './better-auth-cors';

const BETTER_AUTH_PUBLIC_PREFIX = '/auth';
const BETTER_AUTH_EXCHANGE_PATH = '/auth/exchange';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type BetterAuthRequestHeaderValue = string | string[] | number | undefined;
type BetterAuthRequestHeaders = Record<string, BetterAuthRequestHeaderValue>;

type ResponseHeadersWithCookies = Omit<Headers, 'getSetCookie'> & {
  getSetCookie?: () => string[];
};

function normalizeRequestUrl(requestUrl: string): URL {
  return new URL(requestUrl, 'http://alternun.local');
}

function normalizeTargetUrl(targetBaseUrl: string): string {
  return targetBaseUrl.trim().replace(/\/+$/, '');
}

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

function shouldForwardHeader(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    !HOP_BY_HOP_HEADERS.has(normalized) && normalized !== 'host' && normalized !== 'content-length'
  );
}

function serializeRequestBody(body: unknown): string | undefined {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  if (Buffer.isBuffer(body)) {
    return (body as Buffer).toString('utf8');
  }

  return JSON.stringify(body as Record<string, unknown>);
}

export function shouldProxyBetterAuthPath(pathname: string): boolean {
  if (!pathname.startsWith(BETTER_AUTH_PUBLIC_PREFIX)) {
    return false;
  }

  if (
    pathname === BETTER_AUTH_EXCHANGE_PATH ||
    pathname.startsWith(`${BETTER_AUTH_EXCHANGE_PATH}/`)
  ) {
    return false;
  }

  return true;
}

export function buildBetterAuthProxyTargetUrl(requestUrl: string, targetBaseUrl: string): string {
  const incomingUrl = normalizeRequestUrl(requestUrl);
  const normalizedTargetBaseUrl = normalizeTargetUrl(targetBaseUrl);
  return new URL(
    `${incomingUrl.pathname}${incomingUrl.search}`,
    `${normalizedTargetBaseUrl}/`
  ).toString();
}

async function copyProxyResponse(
  reply: FastifyReply,
  response: Response,
  requestHeaders: BetterAuthRequestHeaders
): Promise<void> {
  void reply.code(response.status);

  const responseHeaders = response.headers as ResponseHeadersWithCookies;
  const setCookies = responseHeaders.getSetCookie?.();
  if (setCookies?.length) {
    void reply.header('set-cookie', setCookies);
  }

  const responseHeaderEntries = Array.from(response.headers.entries());
  for (const [name, value] of responseHeaderEntries) {
    const normalizedName = name.toLowerCase();
    if (normalizedName === 'set-cookie' || HOP_BY_HOP_HEADERS.has(normalizedName)) {
      continue;
    }

    void reply.header(name, value);
  }

  applyBetterAuthCorsHeaders(reply, requestHeaders);

  const payload = await response.arrayBuffer();
  void reply.send(Buffer.from(payload));
}

export async function proxyBetterAuthRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  targetBaseUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<boolean> {
  const requestUrl = request.raw.url;
  if (!requestUrl) {
    return false;
  }

  const incomingUrl = normalizeRequestUrl(requestUrl);
  if (!shouldProxyBetterAuthPath(incomingUrl.pathname)) {
    return false;
  }

  if (request.method.toUpperCase() === 'OPTIONS') {
    applyBetterAuthCorsHeaders(reply, request.headers as BetterAuthRequestHeaders, {
      preflight: true,
    });
    void reply.code(204).send();
    return true;
  }

  const targetUrl = buildBetterAuthProxyTargetUrl(requestUrl, targetBaseUrl);
  const headers = new Headers();
  const requestHeaders = request.headers as BetterAuthRequestHeaders;

  for (const [name, value] of Object.entries(requestHeaders)) {
    if (!shouldForwardHeader(name)) {
      continue;
    }

    const normalizedValue = normalizeHeaderValue(value);
    if (normalizedValue) {
      headers.set(name, normalizedValue);
    }
  }

  const method = request.method.toUpperCase();
  const requestBody =
    method === 'GET' || method === 'HEAD' ? undefined : serializeRequestBody(request.body);

  let upstream: Response;

  try {
    upstream = await fetchFn(targetUrl, {
      method,
      headers,
      redirect: 'manual',
      body: requestBody,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    applyBetterAuthCorsHeaders(reply, request.headers as BetterAuthRequestHeaders);
    void reply.code(502).send({
      statusCode: 502,
      error: 'Bad Gateway',
      message: `Better Auth proxy request to ${targetUrl} failed: ${message}`,
    });
    return true;
  }

  await copyProxyResponse(reply, upstream, request.headers as BetterAuthRequestHeaders);
  return true;
}

export function registerBetterAuthProxy(
  app: FastifyInstance,
  options: { targetBaseUrl: string; fetchFn?: typeof fetch }
): void {
  const targetBaseUrl = normalizeTargetUrl(options.targetBaseUrl);
  const fetchFn = options.fetchFn ?? fetch;

  app.route({
    method: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    url: '/auth/*',
    handler: async (request, reply) => {
      if (await proxyBetterAuthRequest(request, reply, targetBaseUrl, fetchFn)) {
        return reply;
      }

      return reply.callNotFound();
    },
  });
}
