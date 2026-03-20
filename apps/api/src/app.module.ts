import { Module } from '@nestjs/common';
import { AuthentikModule } from './modules/authentik/authentik.module';
import { DecapModule } from './modules/decap/decap.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [HealthModule, DecapModule, AuthentikModule],
})
export class AppModule {}
