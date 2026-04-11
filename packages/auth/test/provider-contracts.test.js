import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BetterAuthExecutionProvider,
  SupabaseExecutionProvider,
} from '../dist/index.js';

test('BetterAuthExecutionProvider normalizes social sign-in results', async () => {
  const provider = new BetterAuthExecutionProvider({
    client: {
      runtime: 'web',
      signIn: async () => ({
        user: {
          sub: 'google-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          picture: 'https://example.com/avatar.png',
        },
        accessToken: 'exec-token',
        refreshToken: 'exec-refresh',
        idToken: 'exec-id',
        expiresAt: Date.now() + 60_000,
      }),
      getSession: async () => ({
        user: {
          sub: 'google-123',
          email: 'ada@example.com',
          name: 'Ada Lovelace',
        },
        accessToken: 'exec-token',
      }),
      getSessionToken: async () => 'exec-token',
    },
  });

  const result = await provider.signIn({ provider: 'google', flow: 'redirect' });
  assert.equal(result.externalIdentity?.provider, 'google');
  assert.equal(result.externalIdentity?.providerUserId, 'google-123');
  assert.equal((await provider.getExecutionSession())?.accessToken, 'exec-token');
});

test('BetterAuthExecutionProvider delegates email auth to the legacy execution client', async () => {
  let betterAuthSignInCalled = false;
  let currentUser = null;
  let currentToken = null;
  const fallbackCalls = {
    signInWithEmail: 0,
    signUpWithEmail: 0,
    resendEmailConfirmation: 0,
    verifyEmailConfirmationCode: 0,
  };

  const emailUser = {
    id: 'email-123',
    email: 'ada@example.com',
    provider: 'email',
    providerUserId: 'email-123',
    metadata: {
      provider: 'email',
      providerUserId: 'email-123',
    },
  };

  const provider = new BetterAuthExecutionProvider({
    client: {
      runtime: 'web',
      signIn: async () => {
        betterAuthSignInCalled = true;
        throw new Error('should not be called');
      },
      signUp: async () => ({
        user: null,
      }),
      signOut: async () => {},
      getSession: async () => null,
      refreshSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      getUser: async () => null,
      getSessionToken: async () => null,
    },
    emailFallbackClient: {
      runtime: 'web',
      signInWithEmail: async () => {
        fallbackCalls.signInWithEmail += 1;
        currentUser = emailUser;
        currentToken = 'email-token';
        return emailUser;
      },
      signUpWithEmail: async () => {
        fallbackCalls.signUpWithEmail += 1;
        return {
          needsEmailVerification: false,
          emailAlreadyRegistered: false,
          confirmationEmailSent: false,
        };
      },
      resendEmailConfirmation: async () => {
        fallbackCalls.resendEmailConfirmation += 1;
      },
      verifyEmailConfirmationCode: async () => {
        fallbackCalls.verifyEmailConfirmationCode += 1;
      },
      signIn: async () => {},
      signOut: async () => {
        currentUser = null;
        currentToken = null;
      },
      onAuthStateChange: (callback) => {
        callback(currentUser);
        return () => {};
      },
      getUser: async () => currentUser,
      getSessionToken: async () => currentToken,
      capabilities: () => ({ runtime: 'web', supportedFlows: ['native'] }),
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      setOidcUser: () => {},
      supabase: { auth: {} },
    },
  });

  const result = await provider.signIn({
    provider: 'email',
    flow: 'native',
    email: 'ada@example.com',
    password: 'password123',
  });

  assert.equal(betterAuthSignInCalled, false);
  assert.equal(result.externalIdentity?.provider, 'email');
  assert.equal(result.externalIdentity?.providerUserId, 'email-123');
  assert.equal(result.session?.provider, 'email');
  assert.equal(result.session?.accessToken, 'email-token');
  assert.equal((await provider.getExecutionSession())?.provider, 'email');
  assert.equal((await provider.getUser())?.email, 'ada@example.com');

  await provider.signUpWithEmail('ada@example.com', 'password123', 'en');
  await provider.resendEmailConfirmation('ada@example.com');
  await provider.verifyEmailConfirmationCode('ada@example.com', '123456');

  assert.equal(fallbackCalls.signInWithEmail, 1);
  assert.equal(fallbackCalls.signUpWithEmail, 1);
  assert.equal(fallbackCalls.resendEmailConfirmation, 1);
  assert.equal(fallbackCalls.verifyEmailConfirmationCode, 1);
});

test('BetterAuthExecutionProvider surfaces a trusted-origin hint on fetch failure', async () => {
  const provider = new BetterAuthExecutionProvider({
    baseUrl: 'https://testnet-auth.alternun.co',
    fetchFn: async () => {
      throw new TypeError('NetworkError when attempting to fetch resource.');
    },
  });

  await assert.rejects(
    provider.signIn({ provider: 'google', flow: 'redirect' }),
    /BETTER_AUTH_TRUSTED_ORIGINS/
  );
});

test('SupabaseExecutionProvider adapts legacy auth client behavior', async () => {
  let signOutCalled = false;
  const client = {
    runtime: 'native',
    signIn: async () => {},
    signInWithEmail: async () => ({
      id: 'user-1',
      email: 'ada@example.com',
      provider: 'email',
      providerUserId: 'email-123',
      metadata: {
        provider: 'email',
        providerUserId: 'email-123',
      },
    }),
    signUpWithEmail: async () => ({ needsEmailVerification: false }),
    resendEmailConfirmation: async () => {},
    verifyEmailConfirmationCode: async () => {},
    signOut: async () => {
      signOutCalled = true;
    },
    onAuthStateChange: (callback) => {
      callback(null);
      return () => {};
    },
    getUser: async () => ({
      id: 'user-1',
      email: 'ada@example.com',
      provider: 'email',
      providerUserId: 'email-123',
      metadata: {
        provider: 'email',
        providerUserId: 'email-123',
      },
    }),
    getSessionToken: async () => 'session-token',
    capabilities: () => ({ runtime: 'native', supportedFlows: ['native'] }),
    setOidcUser: () => {},
    supabase: { auth: {} },
  };

  const provider = new SupabaseExecutionProvider(client);
  const user = await provider.signInWithEmail('ada@example.com', 'password123');
  assert.equal(user.email, 'ada@example.com');
  assert.equal((await provider.getExecutionSession())?.accessToken, 'session-token');

  await provider.signOut();
  assert.equal(signOutCalled, true);
});
