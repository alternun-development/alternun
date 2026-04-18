import { Module } from '@nestjs/common';
import { ActivityModule } from './modules/activity/activity.module';
import { AirsModule } from './modules/airs/airs.module';
import { AuthExchangeModule } from './modules/auth-exchange/auth-exchange.module';
import { AuthentikModule } from './modules/authentik/authentik.module';
import { DecapModule } from './modules/decap/decap.module';
import { HealthModule } from './modules/health/health.module';
import { LegalModule } from './modules/legal/legal.module';

@Module({
  imports: [
    HealthModule,
    DecapModule,
    AuthentikModule,
    AuthExchangeModule,
    AirsModule,
    ActivityModule,
    LegalModule,
  ],
})
export class AppModule {}
