import assert from 'node:assert/strict';
import test from 'node:test';
import { AlternunAuthFacade } from '../dist/index.js';

function createIdentity(overrides = {}) {
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

function createFacade() {
  const externalIdentity = createIdentity();
  const executionSession = {
    provider: 'better-auth',
    accessToken: 'execution-token',
    refreshToken: 'execution-refresh',
    idToken: 'execution-id',
    expiresAt: Date.now() + 60_000,
    externalIdentity,
    linkedAccounts: [],
    raw: { source: 'test' },
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
      roles: ['authenticated'],
      metadata: { provider: externalIdentity.provider },
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
    raw: { source: 'test' },
  };

  const executionProvider = {
    name: 'better-auth',
    signIn: async () => ({ session: executionSession, externalIdentity }),
    signUp: async () => ({ session: executionSession, externalIdentity }),
    signOut: async () => {},
    getExecutionSession: async () => executionSession,
    refreshExecutionSession: async () => executionSession,
    linkProvider: async () => null,
    unlinkProvider: async () => {},
    onAuthStateChange: (callback) => {
      callback(null);
      return () => {};
    },
    capabilities: () => ({ runtime: 'web', supportedFlows: ['redirect', 'native'] }),
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
    discoverIssuerConfig: async () => ({ issuer: issuerSession.issuer, authorizationEndpoint: '', tokenEndpoint: '' }),
    validateClaims: async () => ({ valid: true, principal: issuerSession.principal, errors: [] }),
  };

  const identityRepository = {
    name: 'stub-repo',
    upsertPrincipal: async ({ principal }) => ({ ...principal, id: 'principal-1' }),
    findPrincipalByExternalIdentity: async () => null,
    upsertUserProjection: async (input) => input,
    upsertLinkedAccount: async ({ linkedAccount }) => linkedAccount,
    recordProvisioningEvent: async () => {},
  };

  const emailProvider = {
    name: 'supabase',
    sendVerificationEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    sendMagicLink: async () => {},
    healthcheck: async () => ({ ok: true, provider: 'supabase' }),
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
    logger: { log: () => {} },
  });

  return { facade, executionSession, issuerSession, externalIdentity };
}

test('AlternunAuthFacade exchanges execution identity into a canonical issuer session', async () => {
  const { facade } = createFacade();
  const events = [];
  const unsubscribe = facade.onAuthStateChange((user) => {
    events.push(user?.id ?? null);
  });

  const user = await facade.getUser();
  assert.equal(user?.email, 'ada@example.com');
  assert.equal(await facade.getSessionToken(), 'issuer-token');

  await facade.signIn({ provider: 'google', flow: 'redirect' });
  const afterSignIn = await facade.getUser();
  assert.equal(afterSignIn?.id, 'principal-1');
  assert.equal(await facade.getSessionToken(), 'issuer-token');
  assert.ok(events.length > 0);

  unsubscribe();
});

test('AlternunAuthFacade preserves email sign-up flags', async () => {
  const { facade } = createFacade();
  const result = await facade.signUpWithEmail('ada@example.com', 'password123');

  assert.equal(result.needsEmailVerification, false);
  assert.equal(result.emailAlreadyRegistered, false);
  assert.equal(result.confirmationEmailSent, false);
});

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
      roles: ['authenticated'],
      metadata: { runtime: 'native' },
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
    raw: { source: 'native-test' },
  };

  const facade = new AlternunAuthFacade({
    executionProvider: {
      name: 'better-auth',
      signIn: async () => ({ session: null, externalIdentity: null }),
      signUp: async () => ({ session: null, externalIdentity: null }),
      signOut: async () => {},
      getExecutionSession: async () => null,
      refreshExecutionSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      capabilities: () => ({ runtime: 'native', supportedFlows: ['native'] }),
    },
    issuerProvider: {
      name: 'authentik',
      exchangeIdentity: async () => {
        throw new Error('unexpected exchange');
      },
      getIssuerSession: async () => issuerSession,
      refreshIssuerSession: async () => issuerSession,
      logoutIssuerSession: async () => {},
      discoverIssuerConfig: async () => ({ issuer: issuerSession.issuer, authorizationEndpoint: '', tokenEndpoint: '' }),
      validateClaims: async () => ({ valid: true, principal: issuerSession.principal, errors: [] }),
    },
    emailProvider: {
      name: 'supabase',
      sendVerificationEmail: async () => {},
      sendPasswordResetEmail: async () => {},
      sendMagicLink: async () => {},
      healthcheck: async () => ({ ok: true, provider: 'supabase' }),
    },
    identityRepository: {
      name: 'compat-repo',
      upsertPrincipal: async ({ principal }) => ({ ...principal, id: 'native-principal' }),
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input) => input,
      upsertLinkedAccount: async ({ linkedAccount }) => linkedAccount,
      recordProvisioningEvent: async () => {},
    },
    runtime: {
      runtime: 'native',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
    },
  });

  const user = await facade.getUser();
  assert.equal(user?.id, 'native-principal');
  assert.equal(user?.email, externalIdentity.email);
  assert.equal(await facade.getSessionToken(), 'native-issuer-token');
});
