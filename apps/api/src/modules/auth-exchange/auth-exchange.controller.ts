import { Body, Controller, HttpCode, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthExchangeRequestDto } from './dto/auth-exchange-request.dto';
import { AuthExchangeResponseDto } from './dto/auth-exchange-response.dto';
import { AuthExchangeService } from './auth-exchange.service';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: VERSION_NEUTRAL,
})
export class AuthExchangeController {
  constructor(private readonly authExchangeService: AuthExchangeService) {}

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
}
