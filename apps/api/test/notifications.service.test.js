const assert = require('node:assert/strict');
const test = require('node:test');
const { mintIssuerAccessToken } = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');
const { NotificationsService } = require('../src/modules/notifications/notifications.service.ts');

function makeToken(appUserId = 'app-user-123') {
  return mintIssuerAccessToken({
    issuer: 'alternun-api',
    audience: 'alternun',
    principal: {
      subject: 'principal-123',
      email: 'ada@example.com',
      roles: ['authenticated'],
      metadata: { emailVerified: true, appUserId },
    },
    claims: {},
    signingKey: 'test-signing-key',
  }).token;
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    async json() {
      return body;
    },
  };
}

test('NotificationsService lists only the authenticated user notification feed', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let requestUrl = '';
  let requestHeaders;

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    global.fetch = async (url, init = {}) => {
      requestUrl = String(url);
      requestHeaders = init.headers;
      return response([
        {
          id: 'notification-1',
          event_type: 'airs_credited',
          severity: 'success',
          payload: { amount: 10 },
          read_at: null,
          archived_at: null,
          created_at: '2026-08-19T12:00:00.000Z',
        },
      ]);
    };

    const result = await new NotificationsService().list(`Bearer ${makeToken()}`, 20);

    assert.equal(new URL(requestUrl).searchParams.get('user_id'), 'eq.app-user-123');
    assert.equal(new URL(requestUrl).searchParams.get('deleted_at'), 'is.null');
    assert.equal(new URL(requestUrl).searchParams.get('limit'), '20');
    assert.equal(requestHeaders.Authorization, 'Bearer service-role-key');
    assert.deepEqual(result.notifications, [
      {
        id: 'notification-1',
        eventType: 'airs_credited',
        severity: 'success',
        payload: { amount: 10 },
        read: false,
        archived: false,
        createdAt: '2026-08-19T12:00:00.000Z',
      },
    ]);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('NotificationsService scopes notification updates to the authenticated user', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let requestUrl = '';
  let requestBody = '';

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    global.fetch = async (url, init = {}) => {
      requestUrl = String(url);
      requestBody = String(init.body);
      return response(null, 204);
    };

    await new NotificationsService().update(`Bearer ${makeToken('app-user-456')}`, 'notification-1', {
      archived: true,
    });

    assert.equal(new URL(requestUrl).searchParams.get('id'), 'eq.notification-1');
    assert.equal(new URL(requestUrl).searchParams.get('user_id'), 'eq.app-user-456');
    assert.deepEqual(JSON.parse(requestBody), { archived_at: JSON.parse(requestBody).archived_at });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
