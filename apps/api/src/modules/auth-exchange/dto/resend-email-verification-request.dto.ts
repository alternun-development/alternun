import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendEmailVerificationRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
