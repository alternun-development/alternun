/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';
import { AlternunAuthFacade, } from '../dist/index.js';

function createIdentity(overrides = {},) {
  return {
    provider: 'google',
    providerUserId: 'google-123',
    email: 'ada@example.com',
    emailVerified: true,
    displayName: 'Ada Lovelace',
    avatarUrl: 'https://example.com/avatar.png',
    rawClaims: {
      sub: 'google-123',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    },
    ...overrides,
  };
}

function createFacade(overrides = {},) {
  const externalIdentity = createIdentity();
  const executionSession = {
    provider: 'better-auth',
    accessToken: 'execution-token',
    refreshToken: 'execution-refresh',
    idToken: 'execution-id',
    expiresAt: Date.now() + 60_000,
    externalIdentity,
    linkedAccounts: [],
    raw: { source: 'test', },
  };

  const issuerSession = {
    issuer: 'https://sso.example.com/application/o/alternun-mobile/',
    accessToken: 'issuer-token',
    refreshToken: 'issuer-refresh',
    idToken: 'issuer-id',
    expiresAt: Date.now() + 60_000,
    principal: {
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      subject: 'principal-1',
      email: externalIdentity.email,
      roles: ['authenticated',],
      metadata: { provider: externalIdentity.provider, },
    },
    claims: externalIdentity.rawClaims,
    linkedAccounts: [
      {
        provider: externalIdentity.provider,
        providerUserId: externalIdentity.providerUserId,
        type: 'oidc',
        email: externalIdentity.email,
        displayName: externalIdentity.displayName,
        metadata: {},
      },
    ],
    raw: { source: 'test', },
  };

  const executionProvider = {
    name: 'better-auth',
    signIn: async () => ({ session: executionSession, externalIdentity, }),
    signUp: async () => ({ session: executionSession, externalIdentity, }),
    signOut: async () => {},
    getExecutionSession: async () => executionSession,
    refreshExecutionSession: async () => executionSession,
    linkProvider: async () => null,
    unlinkProvider: async () => {},
    onAuthStateChange: (callback,) => {
      callback(null,);
      return () => {};
    },
    capabilities: () => ({ runtime: 'web', supportedFlows: ['redirect', 'native',], }),
    ...overrides.executionProvider,
  };

  const issuerProvider = {
    name: 'authentik',
    exchangeIdentity: async () => ({
      issuerAccessToken: issuerSession.accessToken,
      issuerRefreshToken: issuerSession.refreshToken,
      executionSession,
      principal: issuerSession.principal,
      linkedAccounts: issuerSession.linkedAccounts,
    }),
    getIssuerSession: async () => issuerSession,
    refreshIssuerSession: async () => issuerSession,
    logoutIssuerSession: async () => {},
    discoverIssuerConfig: async () => ({ issuer: issuerSession.issuer, authorizationEndpoint: '', tokenEndpoint: '', }),
    validateClaims: async () => ({ valid: true, principal: issuerSession.principal, errors: [], }),
    ...overrides.issuerProvider,
  };

  const identityRepository = {
    name: 'stub-repo',
    upsertPrincipal: async ({ principal, },) => ({ ...principal, id: 'principal-1', }),
    findPrincipalByExternalIdentity: async () => null,
    upsertUserProjection: async (input,) => input,
    upsertLinkedAccount: async ({ linkedAccount, },) => linkedAccount,
    recordProvisioningEvent: async () => {},
    ...overrides.identityRepository,
  };

  const emailProvider = {
    name: 'supabase',
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    sendMagicLink: async () => {},
    healthcheck: async () => ({ ok: true, provider: 'supabase', }),
    ...overrides.emailProvider,
  };

  const facade = new AlternunAuthFacade({
    executionProvider,
    issuerProvider,
    emailProvider,
    identityRepository,
    runtime: {
      runtime: 'web',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    },
    logger: { log: () => {}, },
  },);

  return { facade, executionSession, issuerSession, externalIdentity, };
}

test('AlternunAuthFacade exchanges execution identity into a canonical issuer session', async () => {
  const { facade, } = createFacade();
  const events = [];
  const unsubscribe = facade.onAuthStateChange((user,) => {
    events.push(user?.id ?? null,);
  },);

  const user = await facade.getUser();
  assert.equal(user?.email, 'ada@example.com',);
  assert.equal(await facade.getSessionToken(), 'issuer-token',);

  await facade.signIn({ provider: 'google', flow: 'redirect', },);
  const afterSignIn = await facade.getUser();
  assert.equal(afterSignIn?.id, 'principal-1',);
  assert.equal(await facade.getSessionToken(), 'issuer-token',);
  assert.ok(events.length > 0,);

  unsubscribe();
},);

test('AlternunAuthFacade caches resolved auth state to avoid repeated session fetches', async () => {
  let executionSessionCalls = 0;

  const { facade, } = createFacade({
    executionProvider: {
      getExecutionSession: async () => {
        executionSessionCalls += 1;
        return null;
      },
      onAuthStateChange: (callback,) => {
        callback(null,);
        return () => {};
      },
    },
    issuerProvider: {
      getIssuerSession: async () => null,
      refreshIssuerSession: async () => null,
    },
  },);

  assert.equal(await facade.getUser(), null,);
  assert.equal(executionSessionCalls, 1,);
  assert.equal(await facade.getUser(), null,);
  assert.equal(executionSessionCalls, 1,);

  const unsubscribe = facade.onAuthStateChange(() => {},);
  assert.equal(executionSessionCalls, 2,);
  assert.equal(await facade.getUser(), null,);
  unsubscribe();

  assert.equal(executionSessionCalls, 2,);
},);

test('AlternunAuthFacade preserves email sign-up flags', async () => {
  const { facade, } = createFacade();
  const result = await facade.signUpWithEmail('ada@example.com', 'password123',);

  assert.equal(result.needsEmailVerification, false,);
  assert.equal(result.emailAlreadyRegistered, false,);
  assert.equal(result.confirmationEmailSent, false,);
},);

test('AlternunAuthFacade delegates email confirmation resend to the execution provider when available', async () => {
  let executionResendCalls = 0;
  let emailResendCalls = 0;

  const { facade, } = createFacade({
    executionProvider: {
      name: 'better-auth',
      resendEmailConfirmation: async () => {
        executionResendCalls += 1;
      },
    },
    emailProvider: {
      name: 'postmark',
      sendVerificationEmail: async () => {
        emailResendCalls += 1;
      },
      sendPasswordResetEmail: async () => {},
      sendMagicLink: async () => {},
      healthcheck: async () => ({ ok: true, provider: 'postmark', }),
    },
  },);

  await facade.resendEmailConfirmation('ada@example.com',);

  assert.equal(executionResendCalls, 1,);
  assert.equal(emailResendCalls, 0,);
},);

test('AlternunAuthFacade delegates password reset email requests to the execution provider helper when available', async () => {
  let observedRequest = null;
  const { facade, } = createFacade({
    executionProvider: {
      requestPasswordResetEmail: async (email, redirectTo,) => {
        observedRequest = { email, redirectTo, };
      },
    },
  },);

  await facade.requestPasswordResetEmail(
    'ada@example.com',
    'https://app.example.com/auth/reset-password?next=%2Fdashboard',
  );

  assert.deepEqual(observedRequest, {
    email: 'ada@example.com',
    redirectTo: 'https://app.example.com/auth/reset-password?next=%2Fdashboard',
  },);
},);

test('AlternunAuthFacade falls back to Supabase password reset helpers when the execution provider does not implement them', async () => {
  let observedRequest = null;
  const { facade, } = createFacade({
    executionProvider: {
      supabase: {
        auth: {
          resetPasswordForEmail: async (email, options,) => {
            observedRequest = { email, options, };
            return { error: null, };
          },
        },
      },
    },
  },);

  await facade.requestPasswordResetEmail('ada@example.com', 'https://app.example.com/auth/reset-password',);

  assert.deepEqual(observedRequest, {
    email: 'ada@example.com',
    options: {
      redirectTo: 'https://app.example.com/auth/reset-password',
    },
  },);
},);

test('AlternunAuthFacade delegates password updates to the execution provider when a reset token is present', async () => {
  let observedRequest = null;
  const { facade, } = createFacade({
    executionProvider: {
      resetPassword: async (newPassword, token,) => {
        observedRequest = { newPassword, token, };
      },
    },
  },);

  await facade.resetPassword('new-password-123', 'reset-token-123',);

  assert.deepEqual(observedRequest, {
    newPassword: 'new-password-123',
    token: 'reset-token-123',
  },);
},);

test('AlternunAuthFacade falls back to an active Supabase recovery session when no reset token is provided', async () => {
  let observedRequest = null;
  const { facade, } = createFacade({
    executionProvider: {
      supabase: {
        auth: {
          updateUser: async (input,) => {
            observedRequest = input;
            return { error: null, };
          },
        },
      },
    },
  },);

  await facade.resetPassword('new-password-123',);

  assert.deepEqual(observedRequest, {
    password: 'new-password-123',
  },);
},);

test('AlternunAuthFacade delegates Google sign-in to the execution provider helper when available', async () => {
  let observedRedirectTo = null;
  const facade = new AlternunAuthFacade({
    executionProvider: {
      name: 'better-auth',
      signIn: async () => ({ session: null, externalIdentity: null, }),
      signUp: async () => ({ session: null, externalIdentity: null, }),
      signOut: async () => {},
      getExecutionSession: async () => null,
      refreshExecutionSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      signInWithGoogle: async (redirectTo,) => {
        observedRedirectTo = redirectTo ?? null;
      },
      capabilities: () => ({ runtime: 'web', supportedFlows: ['redirect', 'native',], }),
    },
    issuerProvider: {
      name: 'authentik',
      exchangeIdentity: async () => ({
        issuerAccessToken: 'issuer-token',
        issuerRefreshToken: null,
        executionSession: null,
        principal: {
          issuer: 'https://sso.example.com/application/o/alternun-mobile/',
          subject: 'principal-compat',
          email: 'ada@example.com',
          roles: ['authenticated',],
          metadata: {},
        },
        linkedAccounts: [],
      }),
      getIssuerSession: async () => null,
      refreshIssuerSession: async () => null,
      logoutIssuerSession: async () => {},
      discoverIssuerConfig: async () => ({ issuer: '', authorizationEndpoint: '', tokenEndpoint: '', }),
      validateClaims: async () => ({ valid: true, principal: null, errors: [], }),
    },
    emailProvider: {
      name: 'supabase',
      sendVerificationEmail: async () => {},
      sendPasswordResetEmail: async () => {},
      sendMagicLink: async () => {},
      healthcheck: async () => ({ ok: true, provider: 'supabase', }),
    },
    identityRepository: {
      name: 'compat-repo',
      upsertPrincipal: async ({ principal, },) => ({ ...principal, id: 'principal-compat', }),
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input,) => input,
      upsertLinkedAccount: async ({ linkedAccount, },) => linkedAccount,
      recordProvisioningEvent: async () => {},
    },
    runtime: {
      runtime: 'web',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    },
  },);

  await facade.signInWithGoogle('https://app.example.com/auth/callback',);
  assert.equal(observedRedirectTo, 'https://app.example.com/auth/callback',);
},);

test('AlternunAuthFacade delegates Discord sign-in to the execution provider helper when available', async () => {
  let observedRedirectTo = null;
  const facade = new AlternunAuthFacade({
    executionProvider: {
      name: 'better-auth',
      signIn: async () => ({ session: null, externalIdentity: null, }),
      signUp: async () => ({ session: null, externalIdentity: null, }),
      signOut: async () => {},
      getExecutionSession: async () => null,
      refreshExecutionSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      signInWithDiscord: async (redirectTo,) => {
        observedRedirectTo = redirectTo ?? null;
      },
      capabilities: () => ({ runtime: 'web', supportedFlows: ['redirect', 'native',], }),
    },
    issuerProvider: {
      name: 'authentik',
      exchangeIdentity: async () => ({
        issuerAccessToken: 'issuer-token',
        issuerRefreshToken: null,
        executionSession: null,
        principal: {
          issuer: 'https://sso.example.com/application/o/alternun-mobile/',
          subject: 'principal-compat',
          email: 'ada@example.com',
          roles: ['authenticated',],
          metadata: {},
        },
        linkedAccounts: [],
      }),
      getIssuerSession: async () => null,
      refreshIssuerSession: async () => null,
      logoutIssuerSession: async () => {},
      discoverIssuerConfig: async () => ({ issuer: '', authorizationEndpoint: '', tokenEndpoint: '', }),
      validateClaims: async () => ({ valid: true, principal: null, errors: [], }),
    },
    emailProvider: {
      name: 'supabase',
      sendVerificationEmail: async () => {},
      sendPasswordResetEmail: async () => {},
      sendMagicLink: async () => {},
      healthcheck: async () => ({ ok: true, provider: 'supabase', }),
    },
    identityRepository: {
      name: 'compat-repo',
      upsertPrincipal: async ({ principal, },) => ({ ...principal, id: 'principal-compat', }),
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input,) => input,
      upsertLinkedAccount: async ({ linkedAccount, },) => linkedAccount,
      recordProvisioningEvent: async () => {},
    },
    runtime: {
      runtime: 'web',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    },
  },);

  await facade.signInWithDiscord('https://app.example.com/auth/callback',);
  assert.equal(observedRedirectTo, 'https://app.example.com/auth/callback',);
},);

test('AlternunAuthFacade restores a native issuer session without browser-only helpers', async () => {
  const externalIdentity = createIdentity();
  const issuerSession = {
    issuer: 'https://sso.example.com/application/o/alternun-mobile/',
    accessToken: 'native-issuer-token',
    refreshToken: 'native-issuer-refresh',
    idToken: 'native-issuer-id',
    expiresAt: Date.now() + 60_000,
    principal: {
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      subject: 'native-principal',
      email: externalIdentity.email,
      roles: ['authenticated',],
      metadata: { runtime: 'native', },
    },
    claims: externalIdentity.rawClaims,
    linkedAccounts: [
      {
        provider: externalIdentity.provider,
        providerUserId: externalIdentity.providerUserId,
        type: 'oidc',
        email: externalIdentity.email,
        displayName: externalIdentity.displayName,
        metadata: {},
      },
    ],
    raw: { source: 'native-test', },
  };

  const facade = new AlternunAuthFacade({
    executionProvider: {
      name: 'better-auth',
      signIn: async () => ({ session: null, externalIdentity: null, }),
      signUp: async () => ({ session: null, externalIdentity: null, }),
      signOut: async () => {},
      getExecutionSession: async () => null,
      refreshExecutionSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      capabilities: () => ({ runtime: 'native', supportedFlows: ['native',], }),
    },
    issuerProvider: {
      name: 'authentik',
      exchangeIdentity: async () => {
        throw new Error('unexpected exchange',);
      },
      getIssuerSession: async () => issuerSession,
      refreshIssuerSession: async () => issuerSession,
      logoutIssuerSession: async () => {},
      discoverIssuerConfig: async () => ({ issuer: issuerSession.issuer, authorizationEndpoint: '', tokenEndpoint: '', }),
      validateClaims: async () => ({ valid: true, principal: issuerSession.principal, errors: [], }),
    },
    emailProvider: {
      name: 'supabase',
      sendVerificationEmail: async () => {},
      sendPasswordResetEmail: async () => {},
      sendMagicLink: async () => {},
      healthcheck: async () => ({ ok: true, provider: 'supabase', }),
    },
    identityRepository: {
      name: 'compat-repo',
      upsertPrincipal: async ({ principal, },) => ({ ...principal, id: 'native-principal', }),
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input,) => input,
      upsertLinkedAccount: async ({ linkedAccount, },) => linkedAccount,
      recordProvisioningEvent: async () => {},
    },
    runtime: {
      runtime: 'native',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    },
  },);

  const user = await facade.getUser();
  assert.equal(user?.id, 'native-principal',);
  assert.equal(user?.email, externalIdentity.email,);
  assert.equal(await facade.getSessionToken(), 'native-issuer-token',);
},);
