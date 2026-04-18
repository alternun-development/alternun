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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  setupOpenApi(app);
  const fastify = app.getHttpAdapter().getInstance();
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
    registerBetterAuthRuntime(fastify, betterAuth.runtimeConfig);
  }
  return app;
}
