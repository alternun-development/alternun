import awsLambdaFastify from '@fastify/aws-lambda';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import 'reflect-metadata';
import { createApp } from './common/bootstrap/create-app';

type ProxyHandler = (
  event: APIGatewayProxyEventV2,
  context: Context
) => Promise<{
  body: string;
  cookies?: string[];
  headers: Record<string, string>;
  isBase64Encoded: boolean;
  statusCode: number;
}>;

let cachedProxy: ProxyHandler | undefined;

async function getProxy(): Promise<ProxyHandler> {
  if (cachedProxy) {
    return cachedProxy;
  }

  const app = await createApp();
  const fastify = app.getHttpAdapter().getInstance();
  // This adapter decorates Fastify requests unless disabled, so it must be created
  // before the app is marked ready. We do not rely on request.awsLambda in this API.
  cachedProxy = awsLambdaFastify(fastify, {
    decorateRequest: false,
  }) as unknown as ProxyHandler;
  await app.init();
  await fastify.ready();

  return cachedProxy;
}

export async function handler(event: APIGatewayProxyEventV2, context: Context) {
  const proxy = await getProxy();
  return proxy(event, context);
}
