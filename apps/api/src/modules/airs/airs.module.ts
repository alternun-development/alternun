import { Module } from '@nestjs/common';
import { AirsController } from './airs.controller';
import { AirsService } from './airs.service';

@Module({
  controllers: [AirsController],
  providers: [AirsService],
})
export class AirsModule {}
