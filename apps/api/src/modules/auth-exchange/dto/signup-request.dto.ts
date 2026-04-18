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
  locale?: string;
}
