import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module';
import { registerBetterAuthProxy } from './better-auth-proxy';
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
  const betterAuthUrl =
    process.env.BETTER_AUTH_URL?.trim() ?? process.env.AUTH_BETTER_AUTH_URL?.trim();
  if (betterAuthUrl) {
    registerBetterAuthProxy(app.getHttpAdapter().getInstance(), {
      targetBaseUrl: betterAuthUrl,
    });
  }
  return app;
}
