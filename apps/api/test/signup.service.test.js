const assert = require('node:assert/strict');
const test = require('node:test');

const { SignupService } = require('../src/modules/auth-exchange/services/signup.service.ts');
const { resolveSignupProviderName } = require('../src/modules/auth-exchange/services/signup/signup.utils.ts');

test('SignupService calls Supabase signup with a derived name', async () => {
  let observedBody = null;
  const originalEnv = { ...process.env };

  try {
    process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI = 'https://airs.alternun.co/auth/callback';

    const service = new SignupService({
      signUpEmail: async ({ body }) => {
        observedBody = body;
        return {
          session: null,
          user: {
            id: 'user-123',
            created_at: '2026-04-20T00:00:00.000Z',
            updated_at: '2026-04-20T00:00:00.000Z',
            email: 'ada@example.com',
            email_confirmed_at: null,
            user_metadata: {
              name: 'ada',
            },
          },
        };
      },
    });

    const result = await service.signUp({
      email: 'ada@example.com',
      password: 'Password123!',
      locale: 'en',
    });

    assert.deepEqual(observedBody, {
      name: 'ada',
      email: 'ada@example.com',
      password: 'Password123!',
      callbackURL: 'https://airs.alternun.co/auth/callback',
      locale: 'en',
    });
    assert.deepEqual(result, {
      needsEmailVerification: true,
      emailAlreadyRegistered: false,
      confirmationEmailSent: true,
      token: null,
      accessToken: null,
      user: {
        id: 'user-123',
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
        email: 'ada@example.com',
        emailVerified: false,
        name: 'ada',
      },
    });
  } finally {
    process.env = originalEnv;
  }
});

test('SignupService exposes a session only after Supabase reports a verified email', async () => {
  const service = new SignupService({
    signUpEmail: async () => ({
      session: {
        access_token: 'supabase-signup-token',
      },
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
  });

  const result = await service.signUp({
    email: 'ada@example.com',
    password: 'Password123!',
  });

  assert.deepEqual(result, {
    needsEmailVerification: false,
    emailAlreadyRegistered: false,
    confirmationEmailSent: false,
    token: 'supabase-signup-token',
    accessToken: 'supabase-signup-token',
    user: {
      id: 'user-123',
      createdAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'ada',
    },
  });
});

test('SignupService returns duplicate-account flags for duplicate errors', async () => {
  const service = new SignupService({
    signUpEmail: async () => {
      throw {
        message: 'Email already exists',
        error: {
          code: '23505',
          constraint: 'users_email_partial_key',
          detail: 'duplicate key value violates unique constraint "users_email_partial_key"',
        },
      };
    },
  }, async () => false);

  const result = await service.signUp({
    email: 'ada@example.com',
    password: 'Password123!',
  });

  assert.deepEqual(result, {
    needsEmailVerification: true,
    emailAlreadyRegistered: false,
    confirmationEmailSent: false,
  });
});

test('SignupService keeps duplicate signups generic when the database error is nested', async () => {
  const service = new SignupService({
    signUpEmail: async () => {
      throw {
        message: 'Failed to create user',
        error: {
          message: 'Failed query: insert into auth.users ...',
          code: '23505',
          constraint: 'users_email_partial_key',
          detail: 'duplicate key value violates unique constraint "users_email_partial_key"',
        },
      };
    },
  }, async () => false);

  const result = await service.signUp({
    email: 'ada@example.com',
    password: 'Password123!',
  });

  assert.deepEqual(result, {
    needsEmailVerification: true,
    emailAlreadyRegistered: false,
    confirmationEmailSent: false,
  });
});

test('resolveSignupProviderName keeps signup on Supabase when Better Auth URLs are configured', () => {
  assert.equal(
    resolveSignupProviderName({
      EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co/auth',
    }),
    'supabase'
  );
});

test('resolveSignupProviderName ignores the execution provider and stays on Supabase unless explicitly overridden', () => {
  assert.equal(
    resolveSignupProviderName({
      AUTH_EXECUTION_PROVIDER: 'better-auth',
      EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
    }),
    'supabase'
  );
});

test('SignupService returns the verification flow when auth.users already has an unverified email', async () => {
  const service = new SignupService(
    {
      signUpEmail: async () => {
        throw {
          message: 'Failed to create user',
          error: {
            message: 'Failed query: insert into auth.users ...',
            code: '23505',
            constraint: 'users_email_partial_key',
          },
        };
      },
    },
    async () => true
  );

  const result = await service.signUp({
    email: 'ada@example.com',
    password: 'Password123!',
  });

  assert.deepEqual(result, {
    needsEmailVerification: true,
    emailAlreadyRegistered: false,
    confirmationEmailSent: false,
  });
});
