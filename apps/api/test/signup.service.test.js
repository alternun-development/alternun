const assert = require('node:assert/strict');
const test = require('node:test');

const { SignupService } = require('../src/modules/auth-exchange/services/signup.service.ts');

test('SignupService calls Better Auth signUpEmail with a derived name', async () => {
  let observedBody = null;

  const service = new SignupService({
    signUpEmail: async ({ body }) => {
      observedBody = body;
      return {
        token: 'better-auth-signup-token',
        user: {
          id: 'user-123',
          createdAt: new Date('2026-04-20T00:00:00.000Z'),
          updatedAt: new Date('2026-04-20T00:00:00.000Z'),
          email: 'ada@example.com',
          emailVerified: false,
          name: 'ada',
          image: null,
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
    locale: 'en',
  });
  assert.deepEqual(result, {
    needsEmailVerification: false,
    emailAlreadyRegistered: false,
    confirmationEmailSent: false,
    token: 'better-auth-signup-token',
    accessToken: 'better-auth-signup-token',
    user: {
      id: 'user-123',
      createdAt: new Date('2026-04-20T00:00:00.000Z'),
      updatedAt: new Date('2026-04-20T00:00:00.000Z'),
      email: 'ada@example.com',
      emailVerified: false,
      name: 'ada',
    },
  });
});

test('SignupService returns duplicate-account flags for Better Auth duplicate errors', async () => {
  const service = new SignupService({
    signUpEmail: async () => {
      throw {
        status: 409,
        message: 'Email already exists',
      };
    },
  });

  const result = await service.signUp({
    email: 'ada@example.com',
    password: 'Password123!',
  });

  assert.deepEqual(result, {
    needsEmailVerification: true,
    emailAlreadyRegistered: true,
    confirmationEmailSent: false,
  });
});
