import { Module } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/admin-auth/admin-auth.nest.guard';
import {
  MarketplaceEnterpriseAdminController,
  MarketplaceActivityAdminController,
  MarketplaceCompletionAdminController,
  MarketplaceProjectAdminController,
  MarketplacePublicController,
} from './marketplace.controller';
import { MarketplaceExceptionFilter } from './marketplace.errors';
import { MarketplaceAdminGuard } from './marketplace.guard';
import {
  createMarketplaceSupabaseClient,
  MARKETPLACE_SUPABASE,
  MarketplaceAdminRepository,
  MarketplacePublicRepository,
} from './marketplace.repository';
import { MarketplaceAdminService, MarketplacePublicService } from './marketplace.service';
import { MarketplaceActivityRepository } from './marketplace-activity.repository';
import { MarketplaceActivityService } from './marketplace-activity.service';

@Module({
  controllers: [
    MarketplacePublicController,
    MarketplaceEnterpriseAdminController,
    MarketplaceProjectAdminController,
    MarketplaceActivityAdminController,
    MarketplaceCompletionAdminController,
  ],
  providers: [
    { provide: MARKETPLACE_SUPABASE, useFactory: () => createMarketplaceSupabaseClient() },
    MarketplacePublicRepository,
    MarketplaceAdminRepository,
    MarketplaceActivityRepository,
    MarketplacePublicService,
    MarketplaceAdminService,
    MarketplaceActivityService,
    MarketplaceExceptionFilter,
    AdminAuthGuard,
    MarketplaceAdminGuard,
  ],
})
export class MarketplaceModule {}
