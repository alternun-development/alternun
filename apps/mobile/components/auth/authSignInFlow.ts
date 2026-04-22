export interface SignUpConfirmationResult {
  needsEmailVerification?: boolean;
  emailAlreadyRegistered?: boolean;
  confirmationEmailSent?: boolean;
  session?: unknown;
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
