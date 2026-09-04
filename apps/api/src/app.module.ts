import { Module } from '@nestjs/common';
import { ActivityModule } from './modules/activity/activity.module';
import { AdminModule } from './modules/admin/admin.module';
import { AirsModule } from './modules/airs/airs.module';
import { AuthExchangeModule } from './modules/auth-exchange/auth-exchange.module';
import { AuthentikModule } from './modules/authentik/authentik.module';
import { DecapModule } from './modules/decap/decap.module';
import { GeoModule } from './modules/geo/geo.module';
import { HealthModule } from './modules/health/health.module';
import { LegalModule } from './modules/legal/legal.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    HealthModule,
    DecapModule,
    AuthentikModule,
    AuthExchangeModule,
    AirsModule,
    ActivityModule,
    AdminModule,
    GeoModule,
    LegalModule,
    NotificationsModule,
    ReferralsModule,
    WalletModule,
  ],
})
export class AppModule {}
