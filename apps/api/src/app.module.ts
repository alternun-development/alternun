import { Module, } from '@nestjs/common';
import { AuthExchangeModule, } from './modules/auth-exchange/auth-exchange.module';
import { AirsModule, } from './modules/airs/airs.module';
import { AuthentikModule, } from './modules/authentik/authentik.module';
import { DecapModule, } from './modules/decap/decap.module';
import { HealthModule, } from './modules/health/health.module';
import { LegalModule, } from './modules/legal/legal.module';

@Module({
  imports: [
    HealthModule,
    DecapModule,
    AuthentikModule,
    AuthExchangeModule,
    AirsModule,
    LegalModule,
  ],
},)
export class AppModule {}
