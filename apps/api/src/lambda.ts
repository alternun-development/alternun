import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type {
  FastifyInstance,
  InjectOptions as FastifyInjectOptions,
  LightMyRequestResponse,
} from 'fastify';
import 'reflect-metadata';
import { createApp } from './common/bootstrap/create-app';
import { normalizeLambdaRequestPath } from './common/bootstrap/request-path';

let cachedFastifyApp: FastifyInstance | undefined;

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

type LambdaResponseHeaders = Record<string, string>;
type LambdaResponseHeaderEntries = Array<readonly [string, unknown]>;

export function normalizeLambdaRequestHeaders(
  event: APIGatewayProxyEventV2
): Record<string, string> {
  const headers = event.headers ?? {};
  const requestHeaders: Record<string, string> = {
    host: headers.host ?? 'testnet.api.alternun.co',
    ...headers,
  };
  const headerCookie = headers.cookie ?? headers.Cookie;
  const eventCookie = event.cookies
    ?.map((cookie) => cookie.trim())
    .filter((cookie) => cookie.length > 0)
    .join('; ');
  const mergedCookie = [headerCookie, eventCookie]
    .map((cookie) => cookie?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join('; ');

  if (mergedCookie) {
    requestHeaders.cookie = mergedCookie;
    delete requestHeaders.Cookie;
  }

  // Remove content-length header as Fastify will recalculate it.
  delete requestHeaders['content-length'];
  delete requestHeaders['Content-Length'];

  return requestHeaders;
}

function getLambdaResponseHeaderEntries(
  responseHeaders: LightMyRequestResponse['headers']
): LambdaResponseHeaderEntries {
  if (responseHeaders instanceof Map) {
    return Array.from(responseHeaders.entries(), ([name, value]) => [String(name), value] as const);
  }

  if (typeof responseHeaders === 'object' && responseHeaders !== null) {
    return Object.entries(responseHeaders as Record<string, unknown>);
  }

  return [];
}

async function getFastifyApp(): Promise<FastifyInstance> {
  if (cachedFastifyApp) {
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] Using cached app');
    return cachedFastifyApp;
  }

  // eslint-disable-next-line no-console
  console.log('[getFastifyApp] Creating new app');
  try {
    const app: Awaited<ReturnType<typeof createApp>> = await createApp();
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] App created, calling init');
    await app.init();
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] App initialized');

    const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] Got fastify instance, calling ready');
    await fastify.ready();
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] Fastify ready');

    cachedFastifyApp = fastify;
    return fastify;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[getFastifyApp] Error:', error);
    throw error;
  }
}

export function normalizeLambdaResponseHeaders(
  responseHeaders: LightMyRequestResponse['headers']
): {
  headers: LambdaResponseHeaders;
  cookies?: string[];
} {
  const headers = new Map<string, string>();
  const cookies: string[] = [];

  for (const [name, value] of getLambdaResponseHeaderEntries(responseHeaders)) {
    const normalizedName = name.toLowerCase();

    if (normalizedName === 'set-cookie') {
      const cookieValues = Array.isArray(value) ? value : value == null ? [] : [value];
      for (const cookieValue of cookieValues) {
        const normalizedCookie = String(cookieValue).trim();
        if (normalizedCookie.length > 0) {
          cookies.push(normalizedCookie);
        }
      }
      continue;
    }

    if (
      normalizedName === 'content-length' ||
      normalizedName === 'host' ||
      HOP_BY_HOP_HEADERS.has(normalizedName)
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      const joinedValue = value
        .map((entry) => String(entry).trim())
        .filter((entry) => entry.length > 0)
        .join(', ');
      if (joinedValue.length > 0) {
        headers.set(normalizedName, joinedValue);
      }
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      headers.set(normalizedName, String(value));
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        headers.set(normalizedName, trimmed);
      }
    }
  }

  const normalizedHeaders: LambdaResponseHeaders = Object.fromEntries(headers);

  return cookies.length > 0
    ? { headers: normalizedHeaders, cookies }
    : { headers: normalizedHeaders };
}

// Bodies the Lambda proxy can return as text; anything else (images, PDFs) goes base64-encoded,
// since decoding binary bytes as UTF-8 corrupts them.
const TEXT_CONTENT_TYPE =
  /^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded)|[^;]*\+(json|xml)\b)/i;

export function encodeLambdaResponseBody(
  contentType: unknown,
  payload: Buffer
): { body: string; isBase64Encoded: boolean } {
  const type = Array.isArray(contentType)
    ? String(contentType[0] ?? '')
    : String(contentType ?? '');
  if (!type.trim() || TEXT_CONTENT_TYPE.test(type.trim()))
    return { body: payload.toString('utf8'), isBase64Encoded: false };
  return { body: payload.toString('base64'), isBase64Encoded: true };
}

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<{
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  cookies?: string[];
  isBase64Encoded: boolean;
}> {
  // eslint-disable-next-line no-console
  console.log('[handler] ====== START ======');
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // eslint-disable-next-line no-console
    console.log('[handler] Getting Fastify app');
    const fastify = await getFastifyApp();
    // eslint-disable-next-line no-console
    console.log('[handler] Got Fastify app');

    const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase() as NonNullable<
      FastifyInjectOptions['method']
    >;
    let path = event.rawPath ?? event.requestContext?.http?.path ?? '/';

    path = normalizeLambdaRequestPath(path);

    // eslint-disable-next-line no-console
    console.log('[handler] Calling fastify.inject', { method, path });

    const body = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString()
        : event.body
      : undefined;

    const requestHeaders = normalizeLambdaRequestHeaders(event);
    const remoteAddress = event.requestContext?.http?.sourceIp?.trim();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await fastify.inject({
      method,
      path: path + (event.rawQueryString ? `?${event.rawQueryString}` : ''),
      headers: requestHeaders,
      payload: body,
      ...(remoteAddress ? { remoteAddress } : {}),
    })) as unknown as LightMyRequestResponse;

    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    console.log('[handler] Got response', { statusCode: response.statusCode });

    const responseEnvelope = normalizeLambdaResponseHeaders(response.headers);
    const responseBody = encodeLambdaResponseBody(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response.headers['content-type'],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      response.rawPayload
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      statusCode: response.statusCode,
      body: responseBody.body,
      headers: responseEnvelope.headers,
      ...(responseEnvelope.cookies ? { cookies: responseEnvelope.cookies } : {}),
      isBase64Encoded: responseBody.isBase64Encoded,
    };

    // eslint-disable-next-line no-console
    console.log('[handler] Returning result');
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[handler] Caught error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: String(error) }),
      headers: { 'Content-Type': 'application/json' },
      isBase64Encoded: false,
    };
  } finally {
    // eslint-disable-next-line no-console
    console.log('[handler] ====== END ======');
  }
}
