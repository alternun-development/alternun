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
