import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type {
  FastifyInstance,
  InjectOptions as FastifyInjectOptions,
  LightMyRequestResponse,
} from 'fastify';
import 'reflect-metadata';
import { createApp } from './common/bootstrap/create-app';

let cachedFastifyApp: FastifyInstance | undefined;

async function getFastifyApp(): Promise<FastifyInstance> {
  if (cachedFastifyApp) {
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] Using cached app');
    return cachedFastifyApp;
  }

  // eslint-disable-next-line no-console
  console.log('[getFastifyApp] Creating new app');
  try {
    const app = await createApp();
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] App created, calling init');
    await app.init();
    // eslint-disable-next-line no-console
    console.log('[getFastifyApp] App initialized');

    const fastify = app.getHttpAdapter().getInstance();
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

export async function handler(
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<{
  statusCode: number;
  body: string;
  headers: Record<string, string | number | boolean>;
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
    const headers = event.headers ?? {};

    // For NestJS URI versioning, prepend /v1 if not already present
    if (!path.match(/^\/v\d+\//)) {
      path = `/v1${path}`;
    }

    // eslint-disable-next-line no-console
    console.log('[handler] Calling fastify.inject', { method, path });

    const body = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString()
        : event.body
      : undefined;

    const requestHeaders: Record<string, string> = {
      host: headers.host ?? 'testnet.api.alternun.co',
      ...headers,
    };

    // Remove content-length header as Fastify will recalculate it
    delete requestHeaders['content-length'];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = (await fastify.inject({
      method,
      path: path + (event.rawQueryString ? `?${event.rawQueryString}` : ''),
      headers: requestHeaders,
      payload: body,
    })) as unknown as LightMyRequestResponse;

    // eslint-disable-next-line no-console, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    console.log('[handler] Got response', { statusCode: response.statusCode });

    // Convert headers - they might be a Map or an object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const responseHeaders = (
      response.headers instanceof Map
        ? Object.fromEntries(response.headers)
        : typeof response.headers === 'object'
        ? response.headers
        : {}
    ) as Record<string, string | number | boolean>;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      statusCode: response.statusCode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      body: response.body,
      headers: responseHeaders,
      isBase64Encoded: false,
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
