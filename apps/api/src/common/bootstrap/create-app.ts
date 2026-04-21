import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { registerBetterAuthProxy } from './better-auth-proxy';
import { registerBetterAuthRuntime, resolveBetterAuthBootstrapConfig } from './better-auth-runtime';
import { setupOpenApi } from '../openapi/setup-openapi';

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    })
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Ensure CORS headers are sent for all responses, including errors
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (!reply.hasHeader('Access-Control-Allow-Origin')) {
      void reply.header('Access-Control-Allow-Origin', request.headers.origin ?? '*');
      void reply.header('Access-Control-Allow-Credentials', 'true');
    }
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
  const betterAuth = resolveBetterAuthBootstrapConfig(process.env);

  if (betterAuth.mode === 'proxy' && betterAuth.targetBaseUrl) {
    fastify.log.info({ targetBaseUrl: betterAuth.targetBaseUrl }, 'Registering Better Auth proxy');
    registerBetterAuthProxy(fastify, {
      targetBaseUrl: betterAuth.targetBaseUrl,
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
