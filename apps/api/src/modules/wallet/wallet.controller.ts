import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { WalletService } from './wallet.service';
import type { WalletAccountRecord } from './wallet.repository';
import type { NetworkParams } from './chains/chain-adapter';
import {
  WalletAddAccountRequestDto,
  WalletBroadcastRequestDto,
  WalletExternalVerifyRequestDto,
  WalletRestoreRequestDto,
  WalletSetupRequestDto,
  WalletVerifyPinRequestDto,
  type WalletActivityResponseDto,
  type WalletBalancesResponseDto,
  type WalletVerifyPinResponseDto,
} from './dto/wallet.dto';

const SUPPORTED_CHAINS = ['evm', 'bitcoin', 'solana'] as const;

// Stricter than the module-wide default (30/min — see wallet.module.ts) for endpoints where a
// single IP hammering many different accounts is the specific risk: PIN brute-forcing
// (verify-pin, defense-in-depth alongside the per-user lockout in WalletService) and account
// creation/takeover-adjacent endpoints (setup/restore).
const SENSITIVE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('wallet')
@Controller({
  path: 'wallet',
  version: [VERSION_NEUTRAL, '1'],
})
@UseGuards(ThrottlerGuard)
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
  @Throttle(SENSITIVE_THROTTLE)
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

  @Post('restore')
  @HttpCode(200)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({
    summary:
      'Device-change recovery: re-derives the same addresses from an already-backed-up mnemonic ' +
      'on a new device and registers a new PIN. Unlike /setup, this overwrites an existing PIN ' +
      'digest/primary account rather than rejecting — the session token is the identity proof.',
  })
  @ApiOkResponse({ description: 'Restored primary wallet account.' })
  async restore(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletRestoreRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    return this.walletService.restore(this.requireToken(authorization), body);
  }

  @Patch('accounts/:id/primary')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Set which of the requesting user's wallet accounts is primary/default (used for " +
      'balances, activity, send/receive, and reward payouts) — can be an Alternun-managed or ' +
      'externally-linked account.',
  })
  @ApiOkResponse({ description: 'Updated wallet accounts.' })
  async setPrimaryAccount(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') accountId: string
  ): Promise<{ accounts: WalletAccountRecord[] }> {
    return this.walletService.setPrimaryAccount(this.requireToken(authorization), accountId);
  }

  @Delete('accounts/:id')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Delete / unlink a wallet account. The primary account auto-promotes to the next account ' +
      'if deleted. Blocked when only one account remains.',
  })
  @ApiOkResponse({ description: 'Updated wallet accounts after deletion.' })
  async deleteAccount(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') accountId: string
  ): Promise<{ accounts: WalletAccountRecord[] }> {
    return this.walletService.deleteAccount(this.requireToken(authorization), accountId);
  }

  @Post('accounts/external/challenge')
  @HttpCode(200)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({
    summary:
      'Generate a one-time challenge message the user must sign with their external wallet (e.g. ' +
      'MetaMask) to prove ownership of an EVM address. The challenge expires in 2 minutes.',
  })
  @ApiOkResponse({ description: 'Challenge message + nonce.' })
  async generateExternalChallenge(
    @Headers('authorization') authorization: string | undefined
  ): Promise<{ challenge: string; nonce: string }> {
    return this.walletService.generateExternalChallenge(this.requireToken(authorization));
  }

  @Post('accounts/external/verify')
  @HttpCode(200)
  @ApiBearerAuth()
  @Throttle(SENSITIVE_THROTTLE)
  @ApiOperation({
    summary:
      'Verify the signed challenge from the external wallet (EIP-191 personal_sign) and link the ' +
      'address as a new wallet account if the signature is valid.',
  })
  @ApiOkResponse({ description: 'Newly linked external wallet account.' })
  async verifyAndLinkExternalWallet(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletExternalVerifyRequestDto
  ): Promise<{ account: WalletAccountRecord }> {
    return this.walletService.verifyAndLinkExternalWallet(
      this.requireToken(authorization),
      body as {
        address: `0x${string}`;
        nonce: string;
        signature: `0x${string}`;
        label?: string;
      }
    );
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
  @Throttle(SENSITIVE_THROTTLE)
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

  @Get('balances')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Read-only multi-chain balance lookup for the primary wallet account, proxied through ' +
      'server-side RPC adapters (task 07) so no RPC provider credentials ship to the client.',
  })
  @ApiOkResponse({ description: 'Per-chain balances.' })
  async balances(
    @Headers('authorization') authorization: string | undefined
  ): Promise<WalletBalancesResponseDto> {
    return this.walletService.balances(this.requireToken(authorization));
  }

  @Get('activity')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Read-only multi-chain transaction history for the primary wallet account. EVM activity is ' +
      'currently empty (raw RPC has no address-history method; needs an indexer, not yet chosen).',
  })
  @ApiOkResponse({ description: 'Per-chain recent activity.' })
  async activity(
    @Headers('authorization') authorization: string | undefined
  ): Promise<WalletActivityResponseDto> {
    return this.walletService.activity(this.requireToken(authorization));
  }

  @Get('network-params')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Public network state (nonce/gas price, UTXOs/fee rate, recent blockhash) needed to build an ' +
      'unsigned transaction client-side. The server never sees the recipient, amount, or signature.',
  })
  @ApiOkResponse({ description: 'Chain-specific network parameters.' })
  async networkParams(
    @Headers('authorization') authorization: string | undefined,
    @Query('chain') chain: string | undefined
  ): Promise<NetworkParams> {
    if (!chain || !SUPPORTED_CHAINS.includes(chain as (typeof SUPPORTED_CHAINS)[number])) {
      throw new BadRequestException(`Unsupported or missing chain query param: ${String(chain)}`);
    }
    return this.walletService.networkParams(
      this.requireToken(authorization),
      chain as (typeof SUPPORTED_CHAINS)[number]
    );
  }

  @Post('broadcast')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Broadcast an already-signed transaction. The server never sees a private key or signs ' +
      'anything — signing happens entirely client-side (00-SPEC.md §6 step 5).',
  })
  @ApiOkResponse({ description: 'Broadcast transaction hash.' })
  async broadcast(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: WalletBroadcastRequestDto
  ): Promise<{ txHash: string }> {
    return this.walletService.broadcast(this.requireToken(authorization), body);
  }
}
