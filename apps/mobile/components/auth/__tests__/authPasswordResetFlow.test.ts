import {
  buildAuthSignInRoute,
  buildPasswordResetRedirectUrl,
  buildPasswordResetRoute,
  finalizePasswordResetRecoverySession,
  formatPasswordResetResendLabel,
  isPasswordResetResendDisabled,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  verifyPasswordResetCode,
  resolveAuthAppOrigin,
} from '../authPasswordResetFlow';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
type TestFn = (name: string, fn: () => void | Promise<void>) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('authPasswordResetFlow', () => {
  it('builds the reset route with next and email query parameters', () => {
    expect(
      buildPasswordResetRoute({
        next: '/dashboard',
        email: 'ada@example.com',
      })
    ).toBe('/auth/reset-password?next=%2Fdashboard&email=ada%40example.com');
  });

  it('builds the redirect URL against the provided app origin', () => {
    expect(
      buildPasswordResetRedirectUrl('https://app.example.com/', {
        next: '/dashboard',
      })
    ).toBe('https://app.example.com/auth/reset-password?next=%2Fdashboard');
  });

  it('builds the sign-in route with the next query parameter', () => {
    expect(
      buildAuthSignInRoute({
        next: '/dashboard',
      })
    ).toBe('/auth?next=%2Fdashboard');
  });

  it('prefers the explicit Expo origin and trims trailing slashes', () => {
    expect(
      resolveAuthAppOrigin({
        EXPO_PUBLIC_ORIGIN: 'https://app.example.com/',
      })
    ).toBe('https://app.example.com');
  });

  it('locks password reset resend requests for 45 seconds after a link is sent', () => {
    expect(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS).toBe(45);
    expect(isPasswordResetResendDisabled(0)).toBe(false);
    expect(isPasswordResetResendDisabled(1)).toBe(true);
    expect(
      formatPasswordResetResendLabel(0, {
        sendLink: 'Send reset link',
        sendAgainIn: (seconds) => `Send again in ${seconds}s`,
      })
    ).toBe('Send reset link');
    expect(
      formatPasswordResetResendLabel(45, {
        sendLink: 'Send reset link',
        sendAgainIn: (seconds) => `Send again in ${seconds}s`,
      })
    ).toBe('Send again in 45s');
  });

  it('finalizes a recovery session through the Supabase auth object without detaching it', async () => {
    let observedThis: Record<string, unknown> | null = null;
    let observedPayload: unknown = null;

    await finalizePasswordResetRecoverySession(
      {
        supabase: {
          auth: {
            fetch: { marker: 'bound' },
            setSession(payload) {
              observedThis = this as Record<string, unknown>;
              observedPayload = payload;
              return { error: null };
            },
          },
        },
      },
      'access-token-123',
      'refresh-token-456'
    );

    expect(observedThis?.fetch).toEqual({ marker: 'bound' });
    expect(observedPayload).toEqual({
      access_token: 'access-token-123',
      refresh_token: 'refresh-token-456',
    });
  });

  it('verifies a recovery code through the Supabase recovery OTP flow without detaching it', async () => {
    let observedThis: Record<string, unknown> | null = null;
    let observedPayload: unknown = null;

    await verifyPasswordResetCode(
      {
        supabase: {
          auth: {
            fetch: { marker: 'bound' },
            verifyOtp(payload) {
              observedThis = this as Record<string, unknown>;
              observedPayload = payload;
              return { error: null };
            },
          },
        },
      },
      'ada@example.com',
      '  97 65 05 18  '
    );

    expect(observedThis?.fetch).toEqual({ marker: 'bound' });
    expect(observedPayload).toEqual({
      type: 'recovery',
      email: 'ada@example.com',
      token: '97650518',
    });
  });
});
