import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignUpRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  referral_code?: string;

  @IsString()
  @IsOptional()
  referred_by_username?: string;

  @IsString()
  @IsOptional()
  referred_by_email?: string;
}
