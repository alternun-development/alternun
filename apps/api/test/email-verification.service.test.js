const assert = require('node:assert/strict');
const test = require('node:test');

const {
  EmailVerificationService,
} = require('../src/modules/auth-exchange/services/email-verification.service.ts');

test('EmailVerificationService verifies signup codes with Supabase through the backend', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const observed = { url: null, init: null };

  global.fetch = async (url, init) => {
    observed.url = String(url);
    observed.init = init;
    return new Response(
      JSON.stringify({
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_at: 1730003600,
        user: {
          id: 'user-123',
          email: 'ada@example.com',
          email_confirmed_at: '2026-08-18T00:00:00.000Z',
          user_metadata: { name: 'Ada' },
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  };

  try {
    process.env.SUPABASE_URL = 'https://testnet.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    const result = await new EmailVerificationService().verifyEmailConfirmation({
      email: ' ADA@example.com ',
      code: '1234 5678',
    });

    assert.equal(observed.url, 'https://testnet.supabase.co/auth/v1/verify');
    assert.equal(observed.init.method, 'POST');
    assert.deepEqual(JSON.parse(observed.init.body), {
      type: 'signup',
      email: 'ada@example.com',
      token: '12345678',
    });
    assert.deepEqual(result.session, {
      token: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresAt: 1730003600,
    });
    assert.equal(result.user.emailVerified, true);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('EmailVerificationService checks the code with Better Auth when it owns email accounts', async () => {
  const originalEnv = { ...process.env };
  const calls = [];
  const betterAuthApi = {
    verifyEmailOTP: async (input) => {
      calls.push(['verify', input.body]);
      return { status: true, user: { id: 'user-1', email: 'ada@example.com' } };
    },
    sendVerificationOTP: async (input) => {
      calls.push(['send', input.body]);
      return { success: true };
    },
  };

  try {
    process.env.AUTH_SIGNUP_PROVIDER = 'better-auth';
    const service = new EmailVerificationService(() => betterAuthApi);

    const result = await service.verifyEmailConfirmation({
      email: ' ADA@example.com ',
      code: '123 456',
    });
    const resend = await service.resendEmailConfirmation('ADA@example.com');

    assert.deepEqual(calls, [
      ['verify', { email: 'ada@example.com', otp: '123456' }],
      ['send', { email: 'ada@example.com', type: 'email-verification' }],
    ]);
    assert.equal(result.needsEmailVerification, false);
    assert.equal(result.session, null);
    assert.equal(result.user.email, 'ada@example.com');
    assert.deepEqual(resend, { confirmationEmailSent: true });
  } finally {
    process.env = originalEnv;
  }
});

test('EmailVerificationService returns a 400 for a wrong Better Auth code', async () => {
  const originalEnv = { ...process.env };
  try {
    process.env.AUTH_SIGNUP_PROVIDER = 'better-auth';
    const service = new EmailVerificationService(() => ({
      verifyEmailOTP: async () => {
        const error = new Error('Invalid OTP');
        error.statusCode = 400;
        throw error;
      },
      sendVerificationOTP: async () => undefined,
    }));

    await assert.rejects(
      service.verifyEmailConfirmation({ email: 'ada@example.com', code: '000000' }),
      (error) => error.getStatus() === 400 && /Invalid OTP/.test(error.message)
    );
  } finally {
    process.env = originalEnv;
  }
});

test('EmailVerificationService resends Supabase codes through the backend', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const observed = { url: null, body: null };
  global.fetch = async (url, init) => {
    observed.url = String(url);
    observed.body = JSON.parse(init.body);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    process.env.AUTH_SIGNUP_PROVIDER = 'supabase';
    process.env.SUPABASE_URL = 'https://testnet.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    const result = await new EmailVerificationService().resendEmailConfirmation(
      ' ADA@example.com '
    );

    assert.equal(observed.url, 'https://testnet.supabase.co/auth/v1/resend');
    assert.deepEqual(observed.body, { type: 'signup', email: 'ada@example.com' });
    assert.deepEqual(result, { confirmationEmailSent: true });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
