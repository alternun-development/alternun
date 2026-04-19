import { Module } from '@nestjs/common';
import { AuthExchangeController } from './auth-exchange.controller';
import { AuthExchangeService } from './auth-exchange.service';
import { SupabaseSignupService } from './services/supabase-signup.service';
import { SocialSignInService } from './services/social-signin.service';

@Module({
  controllers: [AuthExchangeController],
  providers: [AuthExchangeService, SupabaseSignupService, SocialSignInService],
})
export class AuthExchangeModule {}
