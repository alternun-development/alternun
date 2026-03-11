import { Module } from '@nestjs/common';
import { DecapModule } from './modules/decap/decap.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [HealthModule, DecapModule],
})
export class AppModule {}
