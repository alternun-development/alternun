import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthFacade } from '../dist/index.js';

test('createAuthFacade preserves the current app-facing compatibility surface', async () => {
  const facade = createAuthFacade({
    runtime: {
      runtime: 'native',
      executionProvider: 'better-auth',
      issuerProvider: 'authentik',
      emailProvider: 'supabase',
      authentikIssuer: 'https://sso.example.com/application/o/alternun-mobile/',
      authentikClientId: 'alternun-mobile',
      authentikRedirectUri: 'myapp://auth/callback',
    },
    executionProvider: {
      name: 'better-auth',
      signIn: async () => ({
        session: null,
        externalIdentity: null,
      }),
      signUp: async () => ({
        session: null,
        externalIdentity: null,
        needsEmailVerification: true,
        emailAlreadyRegistered: false,
        confirmationEmailSent: false,
      }),
      signOut: async () => {},
      getExecutionSession: async () => null,
      refreshExecutionSession: async () => null,
      linkProvider: async () => null,
      unlinkProvider: async () => {},
      capabilities: () => ({ runtime: 'native', supportedFlows: ['native'] }),
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
          roles: ['authenticated'],
          metadata: {},
        },
        linkedAccounts: [],
      }),
      getIssuerSession: async () => null,
      refreshIssuerSession: async () => null,
      logoutIssuerSession: async () => {},
      discoverIssuerConfig: async () => ({ issuer: '', authorizationEndpoint: '', tokenEndpoint: '' }),
      validateClaims: async () => ({ valid: true, principal: null, errors: [] }),
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
      upsertPrincipal: async ({ principal }) => ({ ...principal, id: 'principal-compat' }),
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input) => input,
      upsertLinkedAccount: async ({ linkedAccount }) => linkedAccount,
      recordProvisioningEvent: async () => {},
    },
  });

  assert.equal(typeof facade.signInWithGoogle, 'function');
  assert.equal(typeof facade.signUpWithEmail, 'function');
  assert.equal(typeof facade.setOidcUser, 'function');
  assert.ok('supabase' in facade);

  facade.setOidcUser({ id: 'compat-user' });
  assert.equal((await facade.getUser())?.id, 'compat-user');
});
