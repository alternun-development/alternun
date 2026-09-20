import { ThrottlerModule } from '@nestjs/throttler';
import { MilestoneShareController } from './sharing/milestone-share.controller';
import { MilestoneShareService } from './sharing/milestone-share.service';
import { Module } from '@nestjs/common';
import { AirsController } from './airs.controller';
import { AirsService } from './airs.service';
import { AirsRegistrationBonusController } from './controllers/airs-registration-bonus.controller';
import { AirsRegistrationBonusService } from './services/airs-registration-bonus.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }])],
  controllers: [MilestoneShareController, AirsController, AirsRegistrationBonusController],
  providers: [MilestoneShareService, AirsService, AirsRegistrationBonusService],
})
export class AirsModule {}
