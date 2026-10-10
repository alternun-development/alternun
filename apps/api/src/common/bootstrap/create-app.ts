import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { FastifyInstance } from 'fastify';
import { AppModule } from '../../app.module';
import { BETTER_AUTH_ALLOWED_HEADERS, resolveBetterAuthTrustedOrigin } from './better-auth-cors';
import { registerBetterAuthProxy } from './better-auth-proxy';
import { registerBetterAuthRuntime, resolveBetterAuthBootstrapConfig } from './better-auth-runtime';
import { setupOpenApi } from '../openapi/setup-openapi';

export async function createApp(): Promise<INestApplication> {
  const fastifyAdapter = new FastifyAdapter({
    logger: true,
  }) as unknown as AbstractHttpAdapter;

  const app = await NestFactory.create(AppModule, fastifyAdapter);

  app.enableVersioning({
    type: VersioningType.URI,
  });
  const betterAuth = resolveBetterAuthBootstrapConfig(process.env);
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, Boolean(resolveBetterAuthTrustedOrigin(origin, betterAuth.trustedOrigins)));
    },
    credentials: true,
    allowedHeaders: [...BETTER_AUTH_ALLOWED_HEADERS],
  });

  // Preserve CORS headers on errors without allowing origins outside the shared allowlist.
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
  fastify.addHook('onSend', async (request, reply, payload) => {
    const trustedOrigin = resolveBetterAuthTrustedOrigin(
      request.headers.origin,
      betterAuth.trustedOrigins
    );

    if (!trustedOrigin) {
      void reply.removeHeader('Access-Control-Allow-Origin');
      void reply.removeHeader('Access-Control-Allow-Credentials');
      void reply.removeHeader('Access-Control-Allow-Methods');
      void reply.removeHeader('Access-Control-Allow-Headers');
      void reply.removeHeader('Access-Control-Max-Age');
      return payload;
    }

    void reply.header('Access-Control-Allow-Origin', trustedOrigin);
    void reply.header('Access-Control-Allow-Credentials', 'true');
    return payload;
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  setupOpenApi(app);

  if (betterAuth.mode === 'proxy' && betterAuth.targetBaseUrl) {
    fastify.log.info({ targetBaseUrl: betterAuth.targetBaseUrl }, 'Registering Better Auth proxy');
    registerBetterAuthProxy(fastify, {
      targetBaseUrl: betterAuth.targetBaseUrl,
      trustedOrigins: betterAuth.trustedOrigins,
    });
  }

  if (betterAuth.mode === 'embedded' && betterAuth.runtimeConfig) {
    fastify.log.info(
      { baseURL: betterAuth.runtimeConfig.baseURL },
      'Registering embedded Better Auth runtime'
    );
    try {
      registerBetterAuthRuntime(fastify, betterAuth.runtimeConfig);
      fastify.log.info('Successfully registered Better Auth runtime routes');
    } catch (error) {
      fastify.log.error(error, 'Failed to register Better Auth runtime');
      throw error;
    }
  } else {
    fastify.log.warn(
      { mode: betterAuth.mode, hasConfig: !!betterAuth.runtimeConfig },
      'Better Auth runtime not registered'
    );
  }
  return app;
}
