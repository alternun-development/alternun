import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignInRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

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
