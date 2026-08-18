const assert = require('node:assert/strict');
const test = require('node:test');

const { AuthExchangeController } = require('../src/modules/auth-exchange/auth-exchange.controller.ts');

test('AuthExchangeController verifies email confirmation codes through the backend service', async () => {
  const expected = {
    accessToken: 'access-token',
    session: { token: 'access-token', refreshToken: 'refresh-token', expiresAt: 1730003600 },
    user: { id: 'user-123', email: 'ada@example.com', emailVerified: true },
  };
  const verificationService = {
    verifyEmailConfirmation: async (input) => {
      assert.deepEqual(input, { email: 'ada@example.com', code: '12345678' });
      return expected;
    },
  };
  const controller = new AuthExchangeController({}, {}, {}, {}, verificationService);

  const result = await controller.verifyEmailConfirmation({
    email: 'ada@example.com',
    code: '12345678',
  });

  assert.deepEqual(result, expected);
});
