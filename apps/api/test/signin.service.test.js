const assert = require('node:assert/strict');
const test = require('node:test');

const { SignInService } = require('../src/modules/auth-exchange/services/signin.service.ts');

test('SignInService signs in with Supabase password auth and returns a normalized session', async () => {
  const originalFetch = global.fetch;
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
          created_at: '2026-04-20T00:00:00.000Z',
          updated_at: '2026-04-20T00:00:00.000Z',
          email: 'ada@example.com',
          email_confirmed_at: '2026-04-20T00:00:00.000Z',
          user_metadata: {
            name: 'ada',
          },
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  };

  const originalEnv = { ...process.env };

  try {
    process.env.SUPABASE_URL = 'https://testnet.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    const service = new SignInService();
    const result = await service.signIn({
      email: 'ada@example.com',
      password: 'Password123!',
    });

    assert.equal(observed.url, 'https://testnet.supabase.co/auth/v1/token?grant_type=password');
    assert.equal(observed.init.method, 'POST');
    assert.deepEqual(JSON.parse(observed.init.body), {
      email: 'ada@example.com',
      password: 'Password123!',
    });
    assert.deepEqual(result, {
      token: 'access-token-123',
      accessToken: 'access-token-123',
      session: {
        token: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: 1730003600,
      },
      user: {
        id: 'user-123',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
        email: 'ada@example.com',
        emailVerified: true,
        name: 'ada',
      },
      needsEmailVerification: false,
      confirmationEmailSent: false,
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('SignInService returns the verification flow for pending email confirmation', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        message: 'Email not confirmed',
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      }
    );

  try {
    process.env.SUPABASE_URL = 'https://testnet.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    const service = new SignInService();
    const result = await service.signIn({
      email: 'ada@example.com',
      password: 'Password123!',
    });

    assert.deepEqual(result, {
      token: null,
      accessToken: null,
      session: null,
      user: null,
      needsEmailVerification: true,
      confirmationEmailSent: false,
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('SignInService falls back to verification when Supabase returns an invalid login for an unverified user', async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        message: 'Invalid login credentials',
      }),
      {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      }
    );

  try {
    process.env.SUPABASE_URL = 'https://testnet.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    const service = new SignInService(async () => true);
    const result = await service.signIn({
      email: 'ada@example.com',
      password: 'Password123!',
    });

    assert.deepEqual(result, {
      token: null,
      accessToken: null,
      session: null,
      user: null,
      needsEmailVerification: true,
      confirmationEmailSent: false,
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
