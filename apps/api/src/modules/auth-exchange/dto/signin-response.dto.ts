import { ApiPropertyOptional } from '@nestjs/swagger';

export class SignInSessionDto {
  @ApiPropertyOptional({ nullable: true })
  token?: string | null;

  @ApiPropertyOptional({ nullable: true })
  refreshToken?: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiresAt?: number | null;
}

export class SignInResponseDto {
  @ApiPropertyOptional({ nullable: true })
  token?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accessToken?: string | null;

  @ApiPropertyOptional({ type: SignInSessionDto, nullable: true })
  session?: SignInSessionDto | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  user?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: false })
  needsEmailVerification?: boolean;

  @ApiPropertyOptional({ example: false })
  confirmationEmailSent?: boolean;
}
