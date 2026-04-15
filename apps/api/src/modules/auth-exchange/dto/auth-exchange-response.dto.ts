import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthExchangeLinkedAccountDto {
  @ApiProperty({ example: 'google' })
  provider!: string;

  @ApiProperty({ example: 'google-123' })
  providerUserId!: string;

  @ApiProperty({ example: 'social', enum: ['social', 'password', 'wallet', 'oidc', 'email'] })
  type!: 'social' | 'password' | 'wallet' | 'oidc' | 'email';

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: 'Ada Lovelace', nullable: true })
  displayName?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl?: string | null;
}

export class AuthExchangePrincipalDto {
  @ApiProperty({ example: 'https://testnet.sso.alternun.co/application/o/alternun-mobile/' })
  issuer!: string;

  @ApiProperty({ example: 'd7f89f4e-2d2d-5d48-a9a4-4b4e0f1328d4' })
  subject!: string;

  @ApiPropertyOptional({ example: 'ada@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: ['authenticated'] })
  roles!: string[];

  @ApiProperty({ type: Object })
  metadata!: Record<string, unknown>;
}

export class AuthExchangeResponseDto {
  @ApiProperty({ example: 'issuer-owned', enum: ['compatibility', 'issuer-owned'] })
  exchangeMode!: 'compatibility' | 'issuer-owned';

  @ApiProperty({ example: 'issuer-token-or-compatibility-fallback' })
  issuerAccessToken!: string;

  @ApiPropertyOptional({ example: 'issuer-refresh-token', nullable: true })
  issuerRefreshToken!: string | null;

  @ApiPropertyOptional({ example: 'issuer-id-token', nullable: true })
  issuerIdToken!: string | null;

  @ApiPropertyOptional({ example: 1730003600, nullable: true })
  issuerExpiresAt!: number | null;

  @ApiProperty({ type: AuthExchangePrincipalDto })
  principal!: AuthExchangePrincipalDto;

  @ApiProperty({ type: [AuthExchangeLinkedAccountDto] })
  linkedAccounts!: AuthExchangeLinkedAccountDto[];

  @ApiProperty({ type: Object })
  claims!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'uuid', nullable: true })
  appUserId!: string | null;

  @ApiProperty({ example: 'synced', enum: ['synced', 'skipped'] })
  syncStatus!: 'synced' | 'skipped';
}
