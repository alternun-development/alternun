import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import type { WalletAccountRecord } from './wallet.repository';
import {
  WalletAddAccountRequestDto,
  WalletSetupRequestDto,
  WalletVerifyPinRequestDto,
  type WalletVerifyPinResponseDto,
} from './dto/wallet.dto';

@ApiTags('wallet')
@Controller({
  path: 'wallet',
  version: [VERSION_NEUTRAL, '1'],
})
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  private requireToken(authorization: string | undefined): string {
    if (!authorization?.trim()) {
      throw new UnauthorizedException('Missing wallet bearer token.');
    }
    return authorization;
  }

  @Post('setup')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Register the PIN verifier and primary account addresses for a newly-created local wallet. ' +
      'Never accepts a mnemonic, private key, or PIN-derived encryption key — only a PIN digest ' +
      '(salt+hash) and public addresses.',
  })
  @ApiOkResponse({ description: 'Created wallet account.' })
  async setup(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletSetupRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    return this.walletService.setup(this.requireToken(authorization), body);
  }

  @Post('accounts')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an additional derived account (public addresses only).' })
  @ApiOkResponse({ description: 'Created wallet account.' })
  async addAccount(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletAddAccountRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    return this.walletService.addAccount(this.requireToken(authorization), body);
  }

  @Get('accounts')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the requesting user's wallet accounts (public addresses only)." })
  @ApiOkResponse({ description: 'Wallet accounts.' })
  async listAccounts(
    @Headers('authorization') authorization: string | undefined
  ): Promise<{ accounts: WalletAccountRecord[] }> {
    return this.walletService.listAccounts(this.requireToken(authorization));
  }

  @Post('verify-pin')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Server-side PIN re-verification gate before Send/Export. Rate-limited/lockable per-user ' +
      '(00-SPEC.md §3.2) — this never decrypts anything itself, it only verifies a PIN digest.',
  })
  @ApiOkResponse({ description: 'Verification result.' })
  async verifyPin(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletVerifyPinRequestDto
  ): Promise<WalletVerifyPinResponseDto> {
    return this.walletService.verifyPin(this.requireToken(authorization), body.pin);
  }
}
