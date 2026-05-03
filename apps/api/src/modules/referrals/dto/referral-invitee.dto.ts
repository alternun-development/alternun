import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralInviteeDto {
  @ApiProperty({
    description: 'User ID of the invited user',
    type: String,
    format: 'uuid',
  })
  user_id!: string;

  @ApiPropertyOptional({
    description: 'Referral code assigned to the invited user, if available',
    type: String,
    nullable: true,
  })
  referral_code!: string | null;

  @ApiPropertyOptional({
    description: 'Display name of the invited user, if available',
    type: String,
    nullable: true,
  })
  name!: string | null;

  @ApiPropertyOptional({
    description: 'Email of the invited user, if available',
    type: String,
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({
    description: 'Timestamp when the referral record was created',
    type: String,
    format: 'date-time',
  })
  created_at!: string;
}
