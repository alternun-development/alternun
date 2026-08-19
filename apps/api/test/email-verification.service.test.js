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
