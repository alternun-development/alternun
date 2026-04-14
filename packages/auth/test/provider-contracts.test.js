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

test('BetterAuthExecutionProvider preserves path prefixes on baseUrl joins', async () => {
  let observedUrl;

  const provider = new BetterAuthExecutionProvider({
    baseUrl: 'http://localhost:8082/better-auth',
    fetchFn: async (url) => {
      observedUrl = String(url);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        async json() {
          return {
            session: null,
          };
        },
        async text() {
          return JSON.stringify({ session: null });
        },
      };
    },
  });

  await provider.signIn({ provider: 'google', flow: 'redirect' });
  assert.equal(observedUrl, 'http://localhost:8082/better-auth/auth/sign-in');
});

test('BetterAuthExecutionProvider prefers the Better Auth client for email flows', async () => {
  let betterAuthSignInCalls = 0;
  let betterAuthSignUpCalls = 0;
  const fallbackCalls = {
    signInWithEmail: 0,
    signUpWithEmail: 0,
    resendEmailConfirmation: 0,
    verifyEmailConfirmationCode: 0,
  };

  const provider = new BetterAuthExecutionProvider({
    client: {
      runtime: 'web',
      signIn: async () => {
        betterAuthSignInCalls += 1;
        return {
          user: {
            sub: 'email-123',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
          },
          accessToken: 'email-token',
          refreshToken: 'email-refresh',
          idToken: 'email-id',
          expiresAt: Date.now() + 60_000,
        };
      },
      signUp: async () => {
        betterAuthSignUpCalls += 1;
        return {
          user: {
            sub: 'email-123',
            email: 'ada@example.com',
            name: 'Ada Lovelace',
          },
          accessToken: 'email-signup-token',
        };
      },
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
        return {
          id: 'legacy-email-123',
          email: 'legacy@example.com',
          provider: 'email',
          providerUserId: 'legacy-email-123',
          metadata: {},
        };
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
      signOut: async () => {},
      onAuthStateChange: () => () => {},
      getUser: async () => ({
        id: 'legacy-email-123',
        email: 'legacy@example.com',
        provider: 'email',
        providerUserId: 'legacy-email-123',
        metadata: {},
      }),
      getSessionToken: async () => 'legacy-token',
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

  assert.equal(betterAuthSignInCalls, 1);
  assert.equal(result.externalIdentity?.provider, 'email');
  assert.equal(result.externalIdentity?.providerUserId, 'email-123');
  assert.equal(result.session?.provider, 'email');
  assert.equal(result.session?.accessToken, 'email-token');
  assert.equal(fallbackCalls.signInWithEmail, 0);

  const signInUser = await provider.signInWithEmail('ada@example.com', 'password123');
  assert.equal(signInUser.email, 'ada@example.com');
  assert.equal(betterAuthSignInCalls, 2);

  const signUpResult = await provider.signUpWithEmail('ada@example.com', 'password123', 'en');
  assert.equal(betterAuthSignUpCalls, 1);
  assert.equal(signUpResult.externalIdentity?.email, 'ada@example.com');
  assert.equal(fallbackCalls.signUpWithEmail, 0);

  await provider.resendEmailConfirmation('ada@example.com');
  await provider.verifyEmailConfirmationCode('ada@example.com', '123456');

  assert.equal(fallbackCalls.resendEmailConfirmation, 1);
  assert.equal(fallbackCalls.verifyEmailConfirmationCode, 1);
});

test('BetterAuthExecutionProvider does not surface legacy sessions by default', async () => {
  const provider = new BetterAuthExecutionProvider({
    client: {
      runtime: 'web',
      signIn: async () => null,
      signUp: async () => null,
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
      signInWithEmail: async () => ({
        id: 'legacy-email-123',
        email: 'legacy@example.com',
        provider: 'email',
        providerUserId: 'legacy-email-123',
        metadata: {},
      }),
      signUpWithEmail: async () => ({
        needsEmailVerification: false,
        emailAlreadyRegistered: false,
        confirmationEmailSent: false,
      }),
      resendEmailConfirmation: async () => {},
      verifyEmailConfirmationCode: async () => {},
      signIn: async () => {},
      signOut: async () => {},
      onAuthStateChange: () => () => {},
      getUser: async () => ({
        id: 'legacy-email-123',
        email: 'legacy@example.com',
        provider: 'email',
        providerUserId: 'legacy-email-123',
        metadata: {},
      }),
      getSessionToken: async () => 'legacy-token',
      capabilities: () => ({ runtime: 'web', supportedFlows: ['native'] }),
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      setOidcUser: () => {},
      supabase: { auth: {} },
    },
  });

  assert.equal(await provider.getExecutionSession(), null);
  assert.equal(await provider.getUser(), null);
});

test('BetterAuthExecutionProvider can opt into legacy session fallback explicitly', async () => {
  const provider = new BetterAuthExecutionProvider({
    allowLegacySessionFallback: true,
    client: {
      runtime: 'web',
      signIn: async () => null,
      signUp: async () => null,
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
      signInWithEmail: async () => ({
        id: 'legacy-email-123',
        email: 'legacy@example.com',
        provider: 'email',
        providerUserId: 'legacy-email-123',
        metadata: {},
      }),
      signUpWithEmail: async () => ({
        needsEmailVerification: false,
        emailAlreadyRegistered: false,
        confirmationEmailSent: false,
      }),
      resendEmailConfirmation: async () => {},
      verifyEmailConfirmationCode: async () => {},
      signIn: async () => {},
      signOut: async () => {},
      onAuthStateChange: () => () => {},
      getUser: async () => ({
        id: 'legacy-email-123',
        email: 'legacy@example.com',
        provider: 'email',
        providerUserId: 'legacy-email-123',
        metadata: {},
      }),
      getSessionToken: async () => 'legacy-token',
      capabilities: () => ({ runtime: 'web', supportedFlows: ['native'] }),
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      setOidcUser: () => {},
      supabase: { auth: {} },
    },
  });

  const session = await provider.getExecutionSession();
  assert.equal(session?.provider, 'email');
  assert.equal(session?.accessToken, 'legacy-token');
});

test('BetterAuthExecutionProvider surfaces a trusted-origin hint on fetch failure', async () => {
  const provider = new BetterAuthExecutionProvider({
    baseUrl: 'https://auth.example.com',
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
