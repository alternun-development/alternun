import {
  isEmailVerificationRequiredMessage,
  resolveConfirmationEmail,
  shouldTransitionToEmailConfirmation,
  shouldSurfaceSharedAuthError,
} from '../authSignInFlow';

const { describe, expect, it } = globalThis as unknown as {
  describe: (name: string, fn: () => void) => void;
  expect: (actual: unknown) => { toBe: (expected: unknown) => void };
  it: (name: string, fn: () => void) => void;
};

describe('authSignInFlow', () => {
  it('keeps the signup flow on the verification screen when verification is requested', () => {
    expect(
      shouldTransitionToEmailConfirmation({
        needsEmailVerification: true,
        session: null,
      })
    ).toBe(true);

    expect(
      shouldTransitionToEmailConfirmation({
        confirmationEmailSent: true,
        session: null,
      })
    ).toBe(true);

    expect(
      shouldTransitionToEmailConfirmation({
        emailAlreadyRegistered: true,
        session: null,
      })
    ).toBe(true);
  });

  it('does not force the verification screen for a completed signup session', () => {
    expect(
      shouldTransitionToEmailConfirmation({
        needsEmailVerification: false,
        confirmationEmailSent: false,
        emailAlreadyRegistered: false,
        session: { accessToken: 'token' },
      })
    ).toBe(false);
  });

  it('recognizes common email verification errors from sign-in responses', () => {
    expect(isEmailVerificationRequiredMessage('Email not verified')).toBe(true);
    expect(isEmailVerificationRequiredMessage('Email not confirmed. Please check inbox.')).toBe(
      true
    );
    expect(isEmailVerificationRequiredMessage('Authentication failed')).toBe(false);
  });

  it('returns a trimmed confirmation email only when one is present', () => {
    expect(resolveConfirmationEmail('  edward@alternun.io  ')).toBe('edward@alternun.io');
    expect(resolveConfirmationEmail('   ')).toBe(null);
    expect(resolveConfirmationEmail(null)).toBe(null);
  });

  it('does not surface shared auth errors while signup is submitting', () => {
    expect(shouldSurfaceSharedAuthError('signup')).toBe(false);
    expect(shouldSurfaceSharedAuthError('signin')).toBe(true);
    expect(shouldSurfaceSharedAuthError(null)).toBe(true);
  });
});
