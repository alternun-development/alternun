import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type BetterAuthDevConfig,
  resolveBetterAuthDevConfig,
} from '../../modules/better-auth-dev/better-auth-dev.config';
import { createBetterAuthDevAuth } from '../../modules/better-auth-dev/better-auth-dev.server';
import { applyBetterAuthCorsHeaders } from './better-auth-cors';
import { shouldProxyBetterAuthPath } from './better-auth-proxy';

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
type BetterAuthRuntimeAuth = {
  handler: (request: Request) => Promise<Response>;
};

type ResponseHeadersWithCookies = Omit<Headers, 'getSetCookie'> & {
  getSetCookie?: () => string[];
};

export interface BetterAuthBootstrapConfig {
  mode: 'disabled' | 'proxy' | 'embedded';
  runtimeConfig?: BetterAuthDevConfig;
  targetBaseUrl?: string;
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

function normalizeComparableUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(
      trimmed
        .replace(/\/+$/, '')
        .replace(/\/auth\/exchange$/, '')
        .replace(/\/auth$/, '')
    );
    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/+$/, '');
  } catch {
    return trimmed
      .replace(/\/+$/, '')
      .replace(/\/auth\/exchange$/, '')
      .replace(/\/auth$/, '');
  }
}

function inferRequestOrigin(
  requestHeaders: BetterAuthRequestHeaders,
  fallbackBaseUrl: string
): string {
  const fallbackUrl = new URL(fallbackBaseUrl);
  const forwardedHost = normalizeHeaderValue(requestHeaders['x-forwarded-host']);
  const forwardedProto = normalizeHeaderValue(requestHeaders['x-forwarded-proto']);
  const host = forwardedHost ?? normalizeHeaderValue(requestHeaders.host) ?? fallbackUrl.host;
  const protocol = forwardedProto ?? fallbackUrl.protocol.replace(/:$/, '');
  return `${protocol}://${host}`;
}

function buildRuntimeRequestUrl(
  requestUrl: string,
  requestHeaders: BetterAuthRequestHeaders,
  fallbackBaseUrl: string
): string {
  return new URL(requestUrl, `${inferRequestOrigin(requestHeaders, fallbackBaseUrl)}/`).toString();
}

async function copyRuntimeResponse(
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

  for (const [name, value] of response.headers.entries()) {
    const normalizedName = (name as string).toLowerCase();
    if (normalizedName === 'set-cookie' || HOP_BY_HOP_HEADERS.has(normalizedName)) {
      continue;
    }

    void reply.header(name as string, value as string);
  }

  applyBetterAuthCorsHeaders(reply, requestHeaders);

  const payload = await response.arrayBuffer();
  void reply.send(Buffer.from(payload));
}

export function resolveBetterAuthBootstrapConfig(
  env: NodeJS.ProcessEnv = process.env
): BetterAuthBootstrapConfig {
  const proxyTargetUrl = normalizeComparableUrl(env.BETTER_AUTH_URL);
  const publicBaseUrl = normalizeComparableUrl(
    env.AUTH_BETTER_AUTH_URL ??
      env.EXPO_PUBLIC_BETTER_AUTH_URL ??
      env.AUTH_EXCHANGE_URL ??
      env.EXPO_PUBLIC_AUTH_EXCHANGE_URL
  );

  if (proxyTargetUrl && (!publicBaseUrl || proxyTargetUrl !== publicBaseUrl)) {
    return {
      mode: 'proxy',
      targetBaseUrl: proxyTargetUrl,
    };
  }

  const runtimeConfig = resolveBetterAuthDevConfig({
    ...env,
    ...(publicBaseUrl ? { BETTER_AUTH_URL: publicBaseUrl } : {}),
  });

  if (publicBaseUrl) {
    return {
      mode: 'embedded',
      runtimeConfig,
    };
  }

  if (proxyTargetUrl) {
    return {
      mode: 'proxy',
      targetBaseUrl: proxyTargetUrl,
    };
  }

  return { mode: 'disabled' };
}

export async function handleBetterAuthRuntimeRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: {
    authHandler: (request: Request) => Promise<Response>;
    baseUrl: string;
  }
): Promise<boolean> {
  const requestUrl = request.raw.url;
  if (!requestUrl) {
    console.log('[Better Auth Handler] No requestUrl');
    return false;
  }

  const requestPath = new URL(requestUrl, 'http://alternun.local').pathname;
  console.log('[Better Auth Handler]', { path: requestPath, method: request.method });

  if (!shouldProxyBetterAuthPath(requestPath)) {
    console.log('[Better Auth Handler] Path not matched:', requestPath);
    return false;
  }

  if (request.method.toUpperCase() === 'OPTIONS') {
    applyBetterAuthCorsHeaders(reply, request.headers as BetterAuthRequestHeaders, {
      preflight: true,
    });
    void reply.code(204).send();
    return true;
  }

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
  const runtimeRequest = new Request(
    buildRuntimeRequestUrl(requestUrl, requestHeaders, options.baseUrl),
    {
      method,
      headers,
      body: requestBody,
      redirect: 'manual',
    }
  );

  let response: Response;
  try {
    response = await options.authHandler(runtimeRequest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
    applyBetterAuthCorsHeaders(reply, request.headers as BetterAuthRequestHeaders);
    void reply.code(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: `Embedded Better Auth request failed: ${message}`,
    });
    return true;
  }

  await copyRuntimeResponse(reply, response, request.headers as BetterAuthRequestHeaders);
  return true;
}

export function registerBetterAuthRuntime(app: FastifyInstance, config: BetterAuthDevConfig): void {
  const auth = createBetterAuthDevAuth(config) as BetterAuthRuntimeAuth;

  app.route({
    method: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    url: '/auth/*',
    handler: async (request, reply) => {
      if (
        await handleBetterAuthRuntimeRequest(request, reply, {
          authHandler: auth.handler,
          baseUrl: config.baseURL,
        })
      ) {
        return reply;
      }

      return reply.callNotFound();
    },
  });
}
