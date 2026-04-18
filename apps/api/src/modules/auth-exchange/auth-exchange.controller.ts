import { Body, Controller, HttpCode, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthExchangeRequestDto } from './dto/auth-exchange-request.dto';
import { AuthExchangeResponseDto } from './dto/auth-exchange-response.dto';
import { AuthExchangeService } from './auth-exchange.service';
import { SupabaseSignupService } from './services/supabase-signup.service';

interface SignUpEmailRequestDto {
  email: string;
  password: string;
  name?: string;
  locale?: string;
}

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: VERSION_NEUTRAL,
})
export class AuthExchangeController {
  constructor(
    private readonly authExchangeService: AuthExchangeService,
    private readonly supabaseSignupService: SupabaseSignupService
  ) {}

  @Post('exchange')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Exchange execution identity for the canonical Alternun principal session',
  })
  @ApiOkResponse({
    description: 'Canonical issuer session payload.',
    type: AuthExchangeResponseDto,
  })
  async exchange(@Body() body: AuthExchangeRequestDto): Promise<AuthExchangeResponseDto> {
    return this.authExchangeService.exchangeIdentity(body);
  }

  @Post('sign-up/email')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Register a new user with email and password',
  })
  @ApiOkResponse({
    description: 'Signup result. Confirmation email sent.',
  })
  async signUpEmail(
    @Body() body: SignUpEmailRequestDto
  ): Promise<{ success: boolean; message?: string }> {
    return this.supabaseSignupService.signUp(body.email, body.password, body.locale);
  }
}
