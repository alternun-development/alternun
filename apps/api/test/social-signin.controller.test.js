const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AuthExchangeController,
} = require('../src/modules/auth-exchange/auth-exchange.controller.ts');

function createReply() {
  return {
    headers: {},
    header(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
  };
}

test('AuthExchangeController forwards Better Auth cookies on social sign-in', async () => {
  const controller = new AuthExchangeController(
    {},
    {},
    {},
    {
      signIn: async () => ({
        provider: 'google',
        redirect: true,
        url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        setCookies: ['better-auth-oauth-state=state-token; Path=/; HttpOnly'],
      }),
    }
  );

  const reply = createReply();
  const result = await controller.socialSignIn({ provider: 'google' }, reply);

  assert.deepEqual(reply.headers['set-cookie'], [
    'better-auth-oauth-state=state-token; Path=/; HttpOnly',
  ]);
  assert.deepEqual(result, {
    provider: 'google',
    redirect: true,
    url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
  });
});
