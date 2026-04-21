import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SocialSignInRequestDto {
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsOptional()
  callbackURL?: string;

  @IsString()
  @IsOptional()
  errorCallbackURL?: string;

  @IsString()
  @IsOptional()
  newUserCallbackURL?: string;

  @IsString()
  @IsOptional()
  redirectUri?: string;
}
