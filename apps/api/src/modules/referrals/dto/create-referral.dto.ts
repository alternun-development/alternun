import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiPropertyOptional({
    description: 'User ID of the account creating the referral (fallback when no auth token)',
    type: String,
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Username of the person who referred this user for legacy attribution',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referred_by_username?: string;

  @ApiPropertyOptional({
    description: 'Email of the person who referred this user for legacy attribution',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referred_by_email?: string;

  @ApiPropertyOptional({
    description: 'Referral code used during signup',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referral_code?: string;

  @ApiPropertyOptional({
    description: 'Legacy invitation code used during signup',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  invitation_code?: string;
}
