const assert = require('node:assert/strict');
const test = require('node:test');

const { claimAirsReportsViaSupabase } = require('../src/modules/auth-exchange/airs-report-claim.ts');
const { AuthExchangeService } = require('../src/modules/auth-exchange/auth-exchange.service.ts');

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function mockFetch(t, handler) {
  const mocked = t.mock.method(globalThis, 'fetch', handler);
  t.after(() => mocked.mock.restore());
  return mocked;
}

test('claim is skipped without Supabase configuration and makes no request', async (t) => {
  const fetchMock = mockFetch(t, async () => Response.json({}));

  const result = await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
    {}
  );

  assert.equal(result.skipped, true);
  assert.equal(result.claimed, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('claim never reaches the database when the email is not confirmed', async (t) => {
  const fetchMock = mockFetch(t, async () => Response.json({}));

  const result = await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: false },
    ENV
  );

  assert.equal(result.ok, false);
  assert.equal(result.claimed, 0);
  assert.equal(result.reasonCode, 'AIRS_REPORT_CLAIM_EMAIL_NOT_CONFIRMED');
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('claim sends the normalized email and a server-side user id with the service key', async (t) => {
  const fetchMock = mockFetch(t, async () =>
    Response.json({ ok: true, claimed: 2, reportIds: ['report-1', 'report-2'] })
  );

  const result = await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: '  Ada@Example.TEST ', emailConfirmed: true, requestId: 'req-1' },
    ENV
  );

  assert.deepEqual(result, {
    skipped: false,
    ok: true,
    claimed: 2,
    reportIds: ['report-1', 'report-2'],
    reasonCode: null,
  });
  const [url, init] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/marketplace_claim_airs_reports');
  assert.equal(init.headers.apikey, 'service-role-key');
  assert.equal(init.headers.Authorization, 'Bearer service-role-key');
  assert.deepEqual(JSON.parse(init.body), {
    p_user_id: 'user-1',
    p_session_email: 'ada@example.test',
    p_email_confirmed: true,
    p_request_id: 'req-1',
  });
});

test('claim generates a distinct request id when none is given', async (t) => {
  const fetchMock = mockFetch(t, async () => Response.json({ ok: true, claimed: 0, reportIds: [] }));

  await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
    ENV
  );
  await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
    ENV
  );

  const ids = fetchMock.mock.calls.map((call) => JSON.parse(call.arguments[1].body).p_request_id);
  assert.match(ids[0], /^claim-/);
  assert.notEqual(ids[0], ids[1]);
});

test('claim reports a database denial without throwing', async (t) => {
  mockFetch(t, async () =>
    Response.json({ ok: false, reasonCode: 'AIRS_REPORT_CLAIM_EMAIL_MISMATCH' })
  );

  const result = await claimAirsReportsViaSupabase(
    { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
    ENV
  );

  assert.equal(result.ok, false);
  assert.equal(result.claimed, 0);
  assert.equal(result.reasonCode, 'AIRS_REPORT_CLAIM_EMAIL_MISMATCH');
});

test('claim ignores bodies it does not understand', async (t) => {
  for (const body of [[{ id: 'x' }], 'text', null, { claimed: 'many', reportIds: [1, 2] }]) {
    mockFetch(t, async () => Response.json(body));
    const result = await claimAirsReportsViaSupabase(
      { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
      ENV
    );
    assert.equal(result.claimed, 0);
    assert.deepEqual(result.reportIds, []);
    globalThis.fetch.mock.restore();
  }
});

test('claim throws on an HTTP failure so callers can log it', async (t) => {
  mockFetch(t, async () => new Response('boom', { status: 500, statusText: 'Server Error' }));

  await assert.rejects(
    claimAirsReportsViaSupabase(
      { appUserId: 'user-1', email: 'ada@example.test', emailConfirmed: true },
      ENV
    ),
    /Failed to claim Airs reports: 500/
  );
});

function exchangeBody(emailVerified) {
  return {
    externalIdentity: {
      provider: 'authentik',
      providerUserId: 'authentik-user-1',
      email: 'ada@example.com',
      emailVerified,
      displayName: 'Ada Lovelace',
      avatarUrl: null,
      rawClaims: {},
    },
  };
}

function setExchangeEnv() {
  process.env.AUTHENTIK_ISSUER = 'https://testnet.sso.alternun.co/application/o/alternun-mobile/';
  process.env.AUTH_AUDIENCE = 'alternun-app';
  process.env.AUTHENTIK_JWT_SIGNING_KEY = 'test-signing-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  delete process.env.AUTH_BETTER_AUTH_URL;
}

function supabaseSession(confirmedAt) {
  return Response.json({
    id: 'supabase-user-1',
    email: 'ada@example.com',
    email_confirmed_at: confirmedAt,
    app_metadata: { provider: 'authentik' },
    identities: [{ provider: 'authentik', id: 'authentik-user-1' }],
  });
}

test('sign-in claims the Airs reports of the synced user when the email is confirmed', async (t) => {
  const originalEnv = { ...process.env };
  const claims = [];

  try {
    setExchangeEnv();
    mockFetch(t, async (url, init) => {
      if (String(url).includes('/auth/v1/user')) return supabaseSession('2026-01-01T00:00:00.000Z');
      if (String(url).includes('marketplace_claim_airs_reports')) {
        claims.push(JSON.parse(init.body));
        return Response.json({ ok: true, claimed: 1, reportIds: ['report-1'] });
      }
      return Response.json([{ id: 'app-user-42' }]);
    });

    const response = await new AuthExchangeService().exchangeIdentity(exchangeBody(true), {
      authorization: 'Bearer valid-supabase-session',
    });

    assert.equal(response.appUserId, 'app-user-42');
    assert.equal(claims.length, 1);
    assert.equal(claims[0].p_user_id, 'app-user-42');
    assert.equal(claims[0].p_session_email, 'ada@example.com');
    assert.equal(claims[0].p_email_confirmed, true);
  } finally {
    process.env = originalEnv;
  }
});

test('sign-in does not claim anything when the email is not confirmed', async (t) => {
  const originalEnv = { ...process.env };
  const urls = [];

  try {
    setExchangeEnv();
    mockFetch(t, async (url) => {
      urls.push(String(url));
      if (String(url).includes('/auth/v1/user')) return supabaseSession(null);
      return Response.json([{ id: 'app-user-42' }]);
    });

    const response = await new AuthExchangeService().exchangeIdentity(exchangeBody(false), {
      authorization: 'Bearer valid-supabase-session',
    });

    assert.equal(response.appUserId, 'app-user-42');
    assert.equal(
      urls.some((url) => url.includes('marketplace_claim_airs_reports')),
      false
    );
  } finally {
    process.env = originalEnv;
  }
});

test('sign-in succeeds even when the claim request fails', async (t) => {
  const originalEnv = { ...process.env };

  try {
    setExchangeEnv();
    mockFetch(t, async (url) => {
      if (String(url).includes('/auth/v1/user')) return supabaseSession('2026-01-01T00:00:00.000Z');
      if (String(url).includes('marketplace_claim_airs_reports')) {
        throw new Error('network down');
      }
      return Response.json([{ id: 'app-user-42' }]);
    });

    const response = await new AuthExchangeService().exchangeIdentity(exchangeBody(true), {
      authorization: 'Bearer valid-supabase-session',
    });

    assert.equal(response.appUserId, 'app-user-42');
    assert.match(response.issuerAccessToken, /^[^.]+\.[^.]+\.[^.]+$/);
  } finally {
    process.env = originalEnv;
  }
});
