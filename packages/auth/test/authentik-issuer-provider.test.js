import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthentikIssuerProvider } from '../dist/index.js';

function createJsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'ERROR',
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function createIdentity() {
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
  };
}

function createRepositoryTracker() {
  const calls = {
    upsertPrincipal: 0,
    upsertUserProjection: 0,
    upsertLinkedAccount: 0,
    recordProvisioningEvent: 0,
  };

  return {
    calls,
    repo: {
      name: 'test-repo',
      upsertPrincipal: async ({ principal }) => {
        calls.upsertPrincipal += 1;
        return { ...principal, id: 'principal-1' };
      },
      findPrincipalByExternalIdentity: async () => null,
      upsertUserProjection: async (input) => {
        calls.upsertUserProjection += 1;
        return input;
      },
      upsertLinkedAccount: async ({ linkedAccount }) => {
        calls.upsertLinkedAccount += 1;
        return linkedAccount;
      },
      recordProvisioningEvent: async () => {
        calls.recordProvisioningEvent += 1;
      },
    },
  };
}

test('AuthentikIssuerProvider prefers the backend auth exchange when configured', async () => {
  const { calls, repo } = createRepositoryTracker();
  const requests = [];

  const provider = new AuthentikIssuerProvider({
    identityRepository: repo,
    issuer: 'https://sso.example.com/application/o/alternun-mobile/',
    clientId: 'alternun-mobile',
    redirectUri: 'myapp://auth/callback',
    authExchangeUrl: 'https://api.example.com/auth/exchange',
    fetchFn: async (url, init) => {
      requests.push({ url, init });
      const body = JSON.parse(String(init?.body ?? '{}'));

      assert.equal(url, 'https://api.example.com/auth/exchange');
      assert.equal(init?.method, 'POST');
      assert.equal(body.externalIdentity.provider, 'google');
      assert.equal(body.executionSession.provider, 'better-auth');

      return createJsonResponse({
        exchangeMode: 'remote',
        syncStatus: 'synced',
        appUserId: 'app-user-1',
        issuerAccessToken: 'issuer-token',
        issuerRefreshToken: 'issuer-refresh',
        issuerIdToken: 'issuer-id',
        issuerExpiresAt: 1730003600,
        principal: {
          issuer: 'https://sso.example.com/application/o/alternun-mobile/',
          subject: 'principal-1',
          email: 'ada@example.com',
          roles: ['authenticated'],
          metadata: {
            source: 'backend',
          },
        },
        linkedAccounts: [
          {
            provider: 'google',
            providerUserId: 'google-123',
            type: 'oidc',
            email: 'ada@example.com',
            displayName: 'Ada Lovelace',
            avatarUrl: 'https://example.com/avatar.png',
            metadata: {
              synced: true,
            },
          },
        ],
        claims: {
          iss: 'https://sso.example.com/application/o/alternun-mobile/',
          sub: 'principal-1',
          email: 'ada@example.com',
          email_verified: true,
          roles: ['authenticated'],
        },
      });
    },
  });

  const result = await provider.exchangeIdentity({
    externalIdentity: createIdentity(),
    executionSession: {
      provider: 'better-auth',
      accessToken: 'exec-token',
      refreshToken: 'exec-refresh',
      idToken: 'exec-id',
      expiresAt: 1730000000,
      linkedAccounts: [],
      raw: { source: 'test' },
    },
    context: {
      trigger: 'oauth-callback',
      runtime: 'web',
      app: 'mobile',
    },
  });

  assert.equal(requests.length, 1);
  assert.equal(result.issuerAccessToken, 'issuer-token');
  assert.equal(result.issuerRefreshToken, 'issuer-refresh');
  assert.equal(result.principal.subject, 'principal-1');
  assert.equal(result.principal.metadata.source, 'backend');
  assert.equal(result.linkedAccounts[0].provider, 'google');
  assert.equal(result.executionSession?.accessToken, 'exec-token');
  assert.equal(calls.upsertPrincipal, 0);
  assert.equal(calls.upsertUserProjection, 0);
  assert.equal(calls.upsertLinkedAccount, 0);
  assert.equal(calls.recordProvisioningEvent, 0);

  const issuerSession = await provider.getIssuerSession();
  assert.equal(issuerSession?.idToken, 'issuer-id');
  assert.equal(issuerSession?.claims.sub, 'principal-1');
});

test('AuthentikIssuerProvider keeps the local compatibility fallback when the backend exchange is absent', async () => {
  const { calls, repo } = createRepositoryTracker();

  const provider = new AuthentikIssuerProvider({
    identityRepository: repo,
    issuer: 'https://sso.example.com/application/o/alternun-mobile/',
    clientId: 'alternun-mobile',
    redirectUri: 'myapp://auth/callback',
  });

  const result = await provider.exchangeIdentity({
    externalIdentity: createIdentity(),
    executionSession: {
      provider: 'better-auth',
      accessToken: 'exec-token',
      refreshToken: 'exec-refresh',
      idToken: 'exec-id',
      expiresAt: 1730000000,
      linkedAccounts: [],
      raw: { source: 'test' },
    },
    context: {
      trigger: 'oauth-callback',
      runtime: 'web',
      app: 'mobile',
    },
  });

  assert.equal(result.issuerAccessToken, 'exec-token');
  assert.equal(result.principal.email, 'ada@example.com');
  assert.equal(calls.upsertPrincipal, 1);
  assert.equal(calls.upsertUserProjection, 1);
  assert.equal(calls.upsertLinkedAccount, 1);
  assert.equal(calls.recordProvisioningEvent, 1);
});
