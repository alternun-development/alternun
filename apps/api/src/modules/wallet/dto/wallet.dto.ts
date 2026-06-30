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
