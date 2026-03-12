import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APP_VERSION } from '../app-metadata';

function resolveBundledSwaggerUiPath(): string | undefined {
  const bundledAssetsPath = join(process.cwd(), 'swagger-ui');

  if (!existsSync(join(bundledAssetsPath, 'swagger-ui-bundle.js'))) {
    return undefined;
  }

  return bundledAssetsPath;
}

export function setupOpenApi(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle('Alternun API')
    .setDescription('Alternun domain backend')
    .setVersion(APP_VERSION)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Authentik access token',
      },
      'bearer'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const customSwaggerUiPath = resolveBundledSwaggerUiPath();

  SwaggerModule.setup('docs', app, document, {
    ...(customSwaggerUiPath ? { customSwaggerUiPath } : {}),
    jsonDocumentUrl: 'docs-json',
  });

  return document;
}
