import { Module } from '@nestjs/common';
import { AuthExchangeController } from './auth-exchange.controller';
import { AuthExchangeService } from './auth-exchange.service';

@Module({
  controllers: [AuthExchangeController],
  providers: [AuthExchangeService],
})
export class AuthExchangeModule {}
