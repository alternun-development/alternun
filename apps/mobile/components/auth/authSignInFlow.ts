export interface SignUpConfirmationResult {
  needsEmailVerification?: boolean;
  emailAlreadyRegistered?: boolean;
  confirmationEmailSent?: boolean;
  session?: unknown;
}

export type AuthSubmitMode =
  | 'signin'
  | 'signup'
  | 'resend'
  | 'verifyCode'
  | 'google'
  | 'discord'
  | 'wallet'
  | null;

export function isEmailVerificationRequiredMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  return (
    normalized.includes('email not confirmed') ||
    normalized.includes('email is not confirmed') ||
    normalized.includes('email not verified') ||
    normalized.includes('email is not verified') ||
    normalized.includes('unverified email') ||
    normalized.includes('confirm your email') ||
    normalized.includes('verification required')
  );
}

export function shouldTransitionToEmailConfirmation(result: SignUpConfirmationResult): boolean {
  if (result.needsEmailVerification === true) {
    return true;
  }

  if (result.confirmationEmailSent === true) {
    return true;
  }

  if (result.emailAlreadyRegistered === true) {
    return true;
  }

  return result.session == null;
}

export function resolveConfirmationEmail(
  confirmationEmail: string | null | undefined
): string | null {
  const trimmed = confirmationEmail?.trim();
  return trimmed?.length ? trimmed : null;
}

export function shouldSurfaceSharedAuthError(submitMode: AuthSubmitMode): boolean {
  return submitMode !== 'signup';
}
