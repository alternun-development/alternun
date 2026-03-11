import { Module } from '@nestjs/common';
import { DecapController } from './decap.controller';
import { DecapService } from './decap.service';

@Module({
  controllers: [DecapController],
  providers: [DecapService],
})
export class DecapModule {}
