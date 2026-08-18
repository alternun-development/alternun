import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailConfirmationRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
