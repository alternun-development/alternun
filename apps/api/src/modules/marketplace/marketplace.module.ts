import { Module } from '@nestjs/common';
import { AdminAuthGuard } from '../../common/admin-auth/admin-auth.nest.guard';
import {
  MarketplaceEnterpriseAdminController,
  MarketplaceEnterprisePublicController,
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
import { MarketplaceMembershipAdminController } from './marketplace-membership.controller';
import { MarketplaceMembershipRepository } from './marketplace-membership.repository';
import { MarketplaceMembershipService } from './marketplace-membership.service';
import {
  MarketplaceCommentAdminController,
  MarketplaceCommentPublicController,
} from './marketplace-comment.controller';
import { MarketplaceCommentRepository } from './marketplace-comment.repository';
import {
  MARKETPLACE_COMMENT_USER_RESOLVER,
  MarketplaceCommentService,
  marketplaceCommentUserResolver,
} from './marketplace-comment.service';
import { MarketplaceParticipantAdminController } from './marketplace-participant.controller';
import { MarketplaceParticipantRepository } from './marketplace-participant.repository';
import { MarketplaceParticipantService } from './marketplace-participant.service';
import {
  MarketplaceEnterpriseAuditAdminController,
  MarketplaceProjectAuditAdminController,
} from './marketplace-audit.controller';
import { MarketplaceAuditRepository } from './marketplace-audit.repository';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { ProjectProposalController } from './project-proposal.controller';
import { ProjectProposalRepository } from './project-proposal.repository';
import { PROJECT_PROPOSAL_EMAIL_SENDER, ProjectProposalService } from './project-proposal.service';
import { sendAirsEmail } from '../airs/airs.email';

@Module({
  controllers: [
    MarketplacePublicController,
    MarketplaceEnterprisePublicController,
    MarketplaceEnterpriseAdminController,
    MarketplaceProjectAdminController,
    MarketplaceActivityAdminController,
    MarketplaceCompletionAdminController,
    MarketplaceMembershipAdminController,
    MarketplaceCommentPublicController,
    MarketplaceCommentAdminController,
    MarketplaceParticipantAdminController,
    MarketplaceProjectAuditAdminController,
    MarketplaceEnterpriseAuditAdminController,
    ProjectProposalController,
  ],
  providers: [
    { provide: MARKETPLACE_SUPABASE, useFactory: () => createMarketplaceSupabaseClient() },
    MarketplacePublicRepository,
    MarketplaceAdminRepository,
    MarketplaceActivityRepository,
    MarketplaceMembershipRepository,
    MarketplaceCommentRepository,
    MarketplaceParticipantRepository,
    MarketplaceAuditRepository,
    ProjectProposalRepository,
    MarketplacePublicService,
    MarketplaceAdminService,
    MarketplaceActivityService,
    MarketplaceMembershipService,
    MarketplaceCommentService,
    MarketplaceParticipantService,
    MarketplaceAuditService,
    ProjectProposalService,
    { provide: PROJECT_PROPOSAL_EMAIL_SENDER, useValue: sendAirsEmail },
    {
      provide: MARKETPLACE_COMMENT_USER_RESOLVER,
      useValue: marketplaceCommentUserResolver,
    },
    MarketplaceExceptionFilter,
    AdminAuthGuard,
    MarketplaceAdminGuard,
  ],
})
export class MarketplaceModule {}
