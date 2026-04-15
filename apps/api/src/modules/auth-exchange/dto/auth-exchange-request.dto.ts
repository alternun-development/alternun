import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthExchangeExternalIdentityDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  @MaxLength(128)
  provider!: string;

  @ApiProperty({ example: 'google-123' })
  @IsString()
  @MaxLength(255)
  providerUserId!: string;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional({ example: true, nullable: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ example: 'Ada Lovelace', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rawClaims?: Record<string, unknown>;
}

export class AuthExchangeExecutionSessionDto {
  @ApiProperty({ example: 'better-auth' })
  @IsString()
  @MaxLength(128)
  provider!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  accessToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  refreshToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  idToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  expiresAt?: number | null;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsObject({ each: true })
  linkedAccounts?: Array<Record<string, unknown>>;
}

export class AuthExchangeContextDto {
  @ApiPropertyOptional({ example: 'oauth-callback', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trigger?: string;

  @ApiPropertyOptional({ example: 'web', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  runtime?: string;

  @ApiPropertyOptional({ example: 'mobile', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  app?: string;

  @ApiPropertyOptional({ example: 'alternun-app', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  audience?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  issuerAccessToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  issuerRefreshToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  issuerIdToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  issuerExpiresAt?: number | null;
}

export class AuthExchangeRequestDto {
  @ApiProperty({ type: AuthExchangeExternalIdentityDto })
  @ValidateNested()
  @Type(() => AuthExchangeExternalIdentityDto)
  externalIdentity!: AuthExchangeExternalIdentityDto;

  @ApiPropertyOptional({ type: AuthExchangeExecutionSessionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthExchangeExecutionSessionDto)
  executionSession?: AuthExchangeExecutionSessionDto;

  @ApiPropertyOptional({ type: AuthExchangeContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthExchangeContextDto)
  context?: AuthExchangeContextDto;
}
