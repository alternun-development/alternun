import { Module } from '@nestjs/common';
import { AuthentikController } from './authentik.controller';
import { AuthentikService } from './authentik.service';

@Module({
  controllers: [AuthentikController],
  providers: [AuthentikService],
})
export class AuthentikModule {}
