import { Module } from '@nestjs/common';
import { AuthentikModule } from './modules/authentik/authentik.module';
import { DecapModule } from './modules/decap/decap.module';
import { HealthModule } from './modules/health/health.module';
import { LegalModule } from './modules/legal/legal.module';

@Module({
  imports: [HealthModule, DecapModule, AuthentikModule, LegalModule],
})
export class AppModule {}
