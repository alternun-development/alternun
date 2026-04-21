import { Body, Controller, HttpCode, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthExchangeRequestDto } from './dto/auth-exchange-request.dto';
import { AuthExchangeResponseDto } from './dto/auth-exchange-response.dto';
import { SignUpRequestDto } from './dto/signup-request.dto';
import { SignUpResponseDto } from './dto/signup-response.dto';
import { AuthExchangeService } from './auth-exchange.service';
import { SignupService } from './services/signup.service';
import { SocialSignInService } from './services/social-signin.service';
import { SocialSignInRequestDto } from './dto/social-signin-request.dto';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: VERSION_NEUTRAL,
})
export class AuthExchangeController {
  constructor(
    private readonly authExchangeService: AuthExchangeService,
    private readonly signupService: SignupService,
    private readonly socialSignInService: SocialSignInService
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
    description: 'Signup result with verification status.',
    type: SignUpResponseDto,
  })
  async signUpEmail(@Body() body: SignUpRequestDto): Promise<SignUpResponseDto> {
    return this.signupService.signUp(body);
  }

  @Post('sign-in/social')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Initiate social sign-in flow with provider',
  })
  @ApiOkResponse({
    description: 'Social sign-in URL and provider info.',
  })
  async socialSignIn(@Body() body?: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!body?.provider) {
      return {
        error:
          'Missing required field: provider. Expected: { provider: "google" | "discord" | ... }',
        url: '',
      };
    }
    return this.socialSignInService.signIn(body as unknown as SocialSignInRequestDto);
  }
}
