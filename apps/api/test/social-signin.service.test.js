const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SocialSignInService,
} = require('../src/modules/auth-exchange/services/social-signin.service.ts');

test('SocialSignInService requests the Better Auth social sign-in URL and maps redirectUri to callbackURL', async () => {
  const observed = {
    body: null,
  };

  const service = new SocialSignInService({
    handler: async (request) => {
      observed.body = await request.clone().json();
      return new Response(
        JSON.stringify({
          redirect: true,
          url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'better-auth-oauth-state=state-token; Path=/; HttpOnly',
          },
        }
      );
    },
  });

  const result = await service.signIn({
    provider: 'Google',
    redirectUri: 'http://localhost:8081/auth/callback',
  });

  assert.deepEqual(observed.body, {
    provider: 'google',
    callbackURL: 'http://localhost:8081/auth/callback',
    errorCallbackURL: 'http://localhost:8081/auth/callback',
    newUserCallbackURL: 'http://localhost:8081/auth/callback',
  });
  assert.deepEqual(result, {
    provider: 'google',
    redirect: true,
    url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
    setCookies: ['better-auth-oauth-state=state-token; Path=/; HttpOnly'],
  });
});

test('SocialSignInService keeps explicit callback URLs when provided', async () => {
  const observed = {
    body: null,
  };

  const service = new SocialSignInService({
    handler: async (request) => {
      observed.body = await request.clone().json();
      return new Response(
        JSON.stringify({
          redirect: true,
          url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'better-auth-oauth-state=state-token; Path=/; HttpOnly',
          },
        }
      );
    },
  });

  await service.signIn({
    provider: 'discord',
    callbackURL: 'https://app.example.com/auth/callback',
    errorCallbackURL: 'https://app.example.com/auth/error',
    newUserCallbackURL: 'https://app.example.com/auth/new-user',
    redirectUri: 'http://localhost:8081/auth/callback',
  });

  assert.deepEqual(observed.body, {
    provider: 'discord',
    callbackURL: 'https://app.example.com/auth/callback',
    errorCallbackURL: 'https://app.example.com/auth/error',
    newUserCallbackURL: 'https://app.example.com/auth/new-user',
  });
});

test('SocialSignInService fills missing error and new-user callback URLs from callbackURL', async () => {
  const observed = {
    body: null,
  };

  const service = new SocialSignInService({
    handler: async (request) => {
      observed.body = await request.clone().json();
      return new Response(
        JSON.stringify({
          redirect: true,
          url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'better-auth-oauth-state=state-token; Path=/; HttpOnly',
          },
        }
      );
    },
  });

  await service.signIn({
    provider: 'google',
    callbackURL: 'https://app.example.com/auth/callback',
  });

  assert.deepEqual(observed.body, {
    provider: 'google',
    callbackURL: 'https://app.example.com/auth/callback',
    errorCallbackURL: 'https://app.example.com/auth/callback',
    newUserCallbackURL: 'https://app.example.com/auth/callback',
  });
});
