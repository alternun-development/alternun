export class SignUpResponseDto {
  needsEmailVerification!: boolean;
  emailAlreadyRegistered!: boolean;
  confirmationEmailSent!: boolean;
}
