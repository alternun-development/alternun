import { Module } from '@nestjs/common';
import { AuthExchangeController } from './auth-exchange.controller';
import { AuthExchangeService } from './auth-exchange.service';
import { SignupService } from './services/signup.service';
import { SocialSignInService } from './services/social-signin.service';

@Module({
  controllers: [AuthExchangeController],
  providers: [AuthExchangeService, SignupService, SocialSignInService],
})
export class AuthExchangeModule {}
