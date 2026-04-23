import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiPropertyOptional({
    description: 'Username of the person who referred this user',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referred_by_username?: string;

  @ApiPropertyOptional({
    description: 'Email of the person who referred this user',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  referred_by_email?: string;

  @ApiPropertyOptional({
    description: 'Invitation code used during signup',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  invitation_code?: string;
}
