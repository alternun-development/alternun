import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignUpResponseDto {
  @ApiPropertyOptional({ nullable: true })
  token?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accessToken?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  user?: Record<string, unknown> | null;

  @ApiProperty({ example: true })
  needsEmailVerification!: boolean;

  @ApiProperty({ example: false })
  emailAlreadyRegistered!: boolean;

  @ApiProperty({ example: true })
  confirmationEmailSent!: boolean;
}
