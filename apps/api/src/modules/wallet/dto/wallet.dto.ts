import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WalletAccountDto {
  @IsInt()
  @Min(0)
  derivationIndex!: number;

  @IsString()
  evmAddress!: string;

  @IsString()
  bitcoinAddress!: string;

  @IsString()
  solanaAddress!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsIn(['airs_hd', 'external'])
  walletType?: 'airs_hd' | 'external';

  @IsOptional()
  @IsString()
  label?: string;
}

export class WalletSetupRequestDto {
  @IsString()
  pinSalt!: string;

  @IsString()
  pinHash!: string;

  @ValidateNested()
  @Type(() => WalletAccountDto)
  account!: WalletAccountDto;
}

export class WalletAddAccountRequestDto {
  @ValidateNested()
  @Type(() => WalletAccountDto)
  account!: WalletAccountDto;
}

// Device-change recovery: re-derives the same addresses from the user's already-backed-up
// mnemonic on a new device, then overwrites the server's PIN digest + primary account record to
// match (the user's session token is the actual identity proof here, not the PIN).
export class WalletRestoreRequestDto {
  @IsString()
  pinSalt!: string;

  @IsString()
  pinHash!: string;

  @ValidateNested()
  @Type(() => WalletAccountDto)
  account!: WalletAccountDto;
}

export class WalletVerifyPinRequestDto {
  @IsString()
  pin!: string;
}

export interface WalletVerifyPinResponseDto {
  verified: boolean;
  lockedUntil?: string;
  remainingAttempts?: number;
  sessionKey?: string;
  sessionExpiresAt?: string;
}

export class WalletBroadcastRequestDto {
  @IsIn(['evm', 'bitcoin', 'solana'])
  chain!: 'evm' | 'bitcoin' | 'solana';

  @IsString()
  signedTransaction!: string;
}

export interface WalletBalancesResponseDto {
  balances: Array<{ chain: 'evm' | 'bitcoin' | 'solana'; amount: string; unit: string }>;
}

export interface WalletActivityResponseDto {
  activity: Array<{
    chain: 'evm' | 'bitcoin' | 'solana';
    hash: string;
    direction: 'in' | 'out' | 'self';
    amount: string;
    counterparty: string | null;
    timestamp: string | null;
    confirmed: boolean;
  }>;
}

export class WalletNetworkParamsQueryDto {
  @IsIn(['evm', 'bitcoin', 'solana'])
  chain!: 'evm' | 'bitcoin' | 'solana';
}

export class WalletExternalVerifyRequestDto {
  @IsString()
  address!: `0x${string}`;

  @IsString()
  nonce!: string;

  @IsString()
  signature!: `0x${string}`;

  @IsOptional()
  @IsString()
  label?: string;
}
