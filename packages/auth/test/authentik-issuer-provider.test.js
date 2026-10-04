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

function createIdentity(provider = 'google') {
  return {
    provider,
    providerUserId: `${provider}-123`,
    email: 'ada@example.com',
    emailVerified: true,
    displayName: 'Ada Lovelace',
    avatarUrl: 'https://example.com/avatar.png',
    rawClaims: {
      sub: `${provider}-123`,
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
      raw: { user: { id: 'google-123' } },
    },
    context: {
      trigger: 'signIn',
      runtime: 'native',
      app: 'mobile',
      authExchangeUrl: 'https://legacy.example.com/auth/exchange',
    },
    claims: { legacy: true },
    redirectTo: 'myapp://legacy-redirect',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.com/auth/exchange');
  assert.equal(requests[0].init?.method, 'POST');
  assert.equal(requests[0].init?.credentials, 'include');
  assert.deepEqual(requests[0].init?.headers, {
    'content-type': 'application/json',
    Authorization: 'Bearer exec-token',
  });
  assert.deepEqual(JSON.parse(String(requests[0].init?.body ?? '{}')), {
    externalIdentity: createIdentity(),
    executionSession: {
      provider: 'better-auth',
      accessToken: 'exec-token',
      refreshToken: 'exec-refresh',
      idToken: 'exec-id',
      expiresAt: 1730000000,
      linkedAccounts: [],
    },
    context: {
      trigger: 'signIn',
      runtime: 'native',
      app: 'mobile',
    },
  });
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

test('AuthentikIssuerProvider authenticates email and social exchanges only with safe credentials', async () => {
  const scenarios = [
    {
      name: 'Supabase email token',
      provider: 'email',
      sessionProvider: 'email',
      runtime: 'native',
      accessToken: 'supabase-token',
      raw: { user: { id: 'email-123' }, runtime: 'native' },
      expectedAuthorization: 'Bearer supabase-token',
    },
    {
      name: 'Supabase email without token',
      provider: 'email',
      sessionProvider: 'email',
      runtime: 'native',
      accessToken: null,
      raw: { user: { id: 'email-123' }, runtime: 'native' },
      expectedAuthorization: undefined,
    },
    {
      name: 'Better Auth native social token',
      provider: 'discord',
      sessionProvider: 'better-auth',
      runtime: 'native',
      accessToken: 'better-auth-token',
      raw: { user: { id: 'discord-123' } },
      expectedAuthorization: 'Bearer better-auth-token',
    },
    {
      name: 'Better Auth native social without token',
      provider: 'discord',
      sessionProvider: 'better-auth',
      runtime: 'native',
      accessToken: null,
      raw: { user: { id: 'discord-123' } },
      expectedAuthorization: undefined,
    },
    {
      name: 'Better Auth web session with ambiguous token',
      provider: 'google',
      sessionProvider: 'better-auth',
      runtime: 'web',
      accessToken: 'session-row-id',
      raw: {
        data: {
          session: { id: 'session-row-id' },
          user: { id: 'google-123' },
        },
      },
      expectedAuthorization: undefined,
    },
  ];

  for (const scenario of scenarios) {
    const { repo } = createRepositoryTracker();
    const requests = [];
    const identity = createIdentity(scenario.provider);
    const executionSession = {
      provider: scenario.sessionProvider,
      accessToken: scenario.accessToken,
      refreshToken: null,
      idToken: null,
      expiresAt: null,
      linkedAccounts: [],
      raw: scenario.raw,
    };
    const provider = new AuthentikIssuerProvider({
      identityRepository: repo,
      issuer: 'https://sso.example.com/application/o/alternun-mobile/',
      clientId: 'alternun-mobile',
      redirectUri: 'myapp://auth/callback',
      authExchangeUrl: 'https://api.example.com/auth/exchange',
      fetchFn: async (url, init) => {
        requests.push({ url, init });
        return createJsonResponse({
          issuerAccessToken: 'issuer-token',
          principal: {
            subject: `${scenario.provider}-principal`,
            email: identity.email,
            roles: ['authenticated'],
          },
          linkedAccounts: [],
          claims: {},
        });
      },
    });

    await provider.exchangeIdentity({
      externalIdentity: identity,
      executionSession,
      context: {
        trigger: 'signIn',
        runtime: scenario.runtime,
        app: 'mobile',
        authExchangeUrl: 'https://legacy.example.com/auth/exchange',
      },
      claims: { legacy: true },
      redirectTo: 'myapp://legacy-redirect',
    });

    assert.equal(requests.length, 1, scenario.name);
    assert.equal(requests[0].init?.credentials, 'include', scenario.name);
    assert.equal(
      requests[0].init?.headers?.Authorization,
      scenario.expectedAuthorization,
      scenario.name
    );
    assert.deepEqual(
      JSON.parse(String(requests[0].init?.body ?? '{}')),
      {
        externalIdentity: identity,
        executionSession: {
          provider: scenario.sessionProvider,
          accessToken: scenario.accessToken,
          refreshToken: null,
          idToken: null,
          expiresAt: null,
          linkedAccounts: [],
        },
        context: {
          trigger: 'signIn',
          runtime: scenario.runtime,
          app: 'mobile',
        },
      },
      scenario.name
    );
  }
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
