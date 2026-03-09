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
  await app.init();

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.ready();

  // The package publishes duplicate callback/promise overloads; we use the promise handler form.
  cachedProxy = awsLambdaFastify(fastify) as unknown as ProxyHandler;
  return cachedProxy;
}

export async function handler(event: APIGatewayProxyEventV2, context: Context) {
  const proxy = await getProxy();
  return proxy(event, context);
}
