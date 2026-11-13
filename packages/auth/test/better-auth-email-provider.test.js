import assert from 'node:assert/strict';
import test from 'node:test';
import { BetterAuthEmailProvider } from '../dist/providers/email/BetterAuthEmailProvider.js';

test('BetterAuthEmailProvider sends verification mail through the Better Auth endpoint', async () => {
  let observedUrl = null;
  let observedBody = null;

  const provider = new BetterAuthEmailProvider({
    baseUrl: 'https://api.example.com/auth',
    fetchFn: async (url, init) => {
      observedUrl = String(url);
      observedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        async json() {
          return { status: true };
        },
        async text() {
          return JSON.stringify({ status: true });
        },
      };
    },
  });

  await provider.sendVerificationEmail({
    email: 'ada@example.com',
  });

  assert.equal(observedUrl, 'https://api.example.com/auth/send-verification-email');
  assert.deepEqual(observedBody, {
    email: 'ada@example.com',
  });
});

test('BetterAuthExecutionProvider verifies the typed email code through the Better Auth OTP endpoint', async () => {
  const { BetterAuthExecutionProvider } = await import(
    '../dist/providers/better-auth/BetterAuthExecutionProvider.js'
  );
  let observedUrl = null;
  let observedBody = null;

  const provider = new BetterAuthExecutionProvider({
    baseUrl: 'https://api.example.com',
    fetchFn: async (url, init) => {
      observedUrl = String(url);
      observedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        async json() {
          return { status: true, token: null };
        },
        async text() {
          return '';
        },
      };
    },
  });

  await provider.verifyEmailConfirmationCode(' Ada@Example.com ', '123 456');

  assert.equal(observedUrl, 'https://api.example.com/auth/email-otp/verify-email');
  assert.deepEqual(observedBody, { email: 'ada@example.com', otp: '123456' });
});

test('BetterAuthExecutionProvider surfaces a rejected email code', async () => {
  const { BetterAuthExecutionProvider } = await import(
    '../dist/providers/better-auth/BetterAuthExecutionProvider.js'
  );
  const provider = new BetterAuthExecutionProvider({
    baseUrl: 'https://api.example.com',
    fetchFn: async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      async json() {
        return { code: 'INVALID_OTP' };
      },
      async text() {
        return '{"code":"INVALID_OTP"}';
      },
    }),
  });

  await assert.rejects(
    provider.verifyEmailConfirmationCode('ada@example.com', '000000'),
    /INVALID_OTP/
  );
});
