import { Module } from '@nestjs/common';
import { AirsController } from './airs.controller';
import { AirsService } from './airs.service';
import { AirsRegistrationBonusController } from './controllers/airs-registration-bonus.controller';
import { AirsRegistrationBonusService } from './services/airs-registration-bonus.service';

@Module({
  controllers: [AirsController, AirsRegistrationBonusController],
  providers: [AirsService, AirsRegistrationBonusService],
})
export class AirsModule {}
