import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralSummaryDto {
  @ApiProperty({
    description: 'Current user ID',
    type: String,
    format: 'uuid',
  })
  user_id!: string;

  @ApiProperty({
    description: 'Current user referral code',
    type: String,
  })
  referral_code!: string;

  @ApiProperty({
    description: 'Share URL for the current user referral code',
    type: String,
    format: 'uri',
  })
  referral_link!: string;

  @ApiProperty({
    description: 'Number of users referred by this account',
    type: Number,
    minimum: 0,
  })
  referral_count!: number;

  @ApiPropertyOptional({
    description: 'User ID of the referrer, if this account was referred',
    type: String,
    nullable: true,
  })
  referred_by_user_id!: string | null;

  @ApiPropertyOptional({
    description: 'Referral code of the referrer, if this account was referred',
    type: String,
    nullable: true,
  })
  referred_by_referral_code!: string | null;

  @ApiPropertyOptional({
    description: 'Display name of the referrer, if available',
    type: String,
    nullable: true,
  })
  referred_by_name!: string | null;

  @ApiPropertyOptional({
    description: 'Email of the referrer, if available',
    type: String,
    nullable: true,
  })
  referred_by_email!: string | null;
}
