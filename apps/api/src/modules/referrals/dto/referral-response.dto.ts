import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the referral record',
    type: String,
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID of the person who was referred',
    type: String,
    format: 'uuid',
  })
  user_id!: string;

  @ApiPropertyOptional({
    description: 'Username of the person who referred this user',
    type: String,
    nullable: true,
  })
  referred_by_username!: string | null;

  @ApiPropertyOptional({
    description: 'Email of the person who referred this user',
    type: String,
    nullable: true,
  })
  referred_by_email!: string | null;

  @ApiPropertyOptional({
    description: 'Invitation code used during signup',
    type: String,
    nullable: true,
  })
  invitation_code!: string | null;

  @ApiPropertyOptional({
    description: 'User ID of the referrer, when the referral was resolved from a code',
    type: String,
    nullable: true,
  })
  referrer_user_id!: string | null;

  @ApiPropertyOptional({
    description: 'Referral code owned by the referrer',
    type: String,
    nullable: true,
  })
  referrer_referral_code!: string | null;

  @ApiPropertyOptional({
    description: 'Share URL for the referral code, when available',
    type: String,
    format: 'uri',
    nullable: true,
  })
  referral_link!: string | null;

  @ApiProperty({
    description: 'Timestamp when the referral was created',
    type: String,
    format: 'date-time',
  })
  created_at!: string;
}
