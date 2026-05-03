/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { BadRequestException, ServiceUnavailableException } = require('@nestjs/common');

const { ReferralsService } = require('../src/modules/referrals/referrals.service.ts');

function createJsonResponse(body, { status = 200, headers = {} } = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'ERROR',
    headers: {
      get(name) {
        return normalizedHeaders.get(String(name).toLowerCase()) ?? null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

function createFetchQueue(responses, calls) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) {
      throw new Error(`Unexpected fetch call: ${String(url)}`);
    }

    return typeof next === 'function' ? next(url, init) : next;
  };
}

test('ReferralsService can be constructed without Supabase env', () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    assert.doesNotThrow(() => new ReferralsService());
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsService.create fails closed when Supabase is unavailable', async () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    const service = new ReferralsService();

    await assert.rejects(
      service.create('user-123', {
        referred_by_username: 'ada',
        referred_by_email: 'ada@example.com',
        referral_code: 'edward-ref123',
      }),
      (error) =>
        error instanceof ServiceUnavailableException &&
        error.getStatus() === 503 &&
        String(error.message).includes('Supabase referrals integration is not configured')
    );
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsService.create resolves a referral code and stores attribution', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `new-user-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
            created_at: '2026-04-20T00:00:00Z',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            user_id: 'user-123',
            referred_by_username: null,
            referred_by_email: null,
            invitation_code: 'edward-ref123',
            referrer_user_id: 'referrer-1',
            referrer_referral_code: 'edward-ref123',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=edward-ref123',
            created_at: '2026-04-25T00:00:00Z',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const response = await service.create('user-123', {
      referral_code: 'EDWARD-REF123',
      referred_by_username: 'ada',
      referred_by_email: 'ada@example.com',
    });

    assert.equal(response.user_id, 'user-123');
    assert.equal(response.referrer_user_id, 'referrer-1');
    assert.equal(response.referrer_referral_code, 'edward-ref123');
    assert.equal(response.invitation_code, 'edward-ref123');
    assert.equal(
      response.referral_link,
      'https://testnet.airs.alternun.co/auth?referralCode=edward-ref123'
    );
    assert.equal(calls.length, 4);
    assert.match(calls[0].url, /\/rest\/v1\/users\?id=eq\.user-123/);
    assert.match(calls[1].url, /\/rest\/v1\/users\?referral_code=eq\.edward-ref123/);
    assert.match(calls[2].url, /\/rest\/v1\/users\?id=eq\.user-123/);
    assert.match(calls[3].url, /\/rest\/v1\/referrals\?on_conflict=user_id/);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.create recovers a stale slug-suffix referral code', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-539f1d',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'edward@alternun.co',
            name: 'edward',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-539f1d',
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            user_id: 'user-123',
            referred_by_username: null,
            referred_by_email: null,
            invitation_code: 'edward-539f1d',
            referrer_user_id: 'referrer-1',
            referrer_referral_code: 'edward-539f1d',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=edward-539f1d',
            created_at: '2026-05-03T00:00:00Z',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const response = await service.create('user-123', {
      referral_code: 'edward-5d64df',
    });

    assert.equal(response.referrer_user_id, 'referrer-1');
    assert.equal(response.referrer_referral_code, 'edward-539f1d');
    assert.equal(response.invitation_code, 'edward-539f1d');
    assert.equal(calls.length, 5);
    assert.match(calls[1].url, /\/rest\/v1\/users\?referral_code=eq\.edward-5d64df/);
    assert.match(calls[2].url, /\/rest\/v1\/users\?referral_code=ilike\.edward-%/);
    assert.deepEqual(JSON.parse(calls[3].init.body), {
      referred_by_user_id: 'referrer-1',
      referred_by_referral_code: 'edward-539f1d',
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.create rejects self referrals', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `new-user-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'self-user-abcdef',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'self@example.com',
            name: 'Self User',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'self-user-abcdef',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'self@example.com',
            name: 'Self User',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();

    await assert.rejects(
      service.create('user-123', {
        referral_code: 'SELF-USER-ABCDEF',
      }),
      (error) => error instanceof BadRequestException && error.getStatus() === 400
    );
    assert.equal(calls.length, 2);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe returns the canonical share link and referral count', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `new-user-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
            created_at: '2026-04-20T00:00:00Z',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
            created_at: '2026-04-19T00:00:00Z',
          },
        ]),
        createJsonResponse([
          {
            id: 'referral-1',
            user_id: 'invitee-1',
            created_at: '2026-04-25T00:00:00Z',
            referrer_user_id: 'user-123',
            referrer_referral_code: 'new-user-123abc',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=new-user-123abc',
          },
          {
            id: 'referral-2',
            user_id: 'invitee-2',
            created_at: '2026-04-26T00:00:00Z',
            referrer_user_id: 'user-123',
            referrer_referral_code: 'new-user-123abc',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=new-user-123abc',
          },
          {
            id: 'referral-3',
            user_id: 'invitee-3',
            created_at: '2026-04-27T00:00:00Z',
            referrer_user_id: 'user-123',
            referrer_referral_code: 'new-user-123abc',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=new-user-123abc',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([
          {
            user_id: 'invitee-1',
            referral_code: 'invitee-1-code',
            email: 'invitee1@example.com',
            name: 'Invitee One',
            created_at: '2026-04-25T00:00:00Z',
            referred_by_user_id: 'user-123',
            referred_by_referral_code: 'new-user-123abc',
          },
          {
            user_id: 'invitee-2',
            referral_code: 'invitee-2-code',
            email: 'invitee2@example.com',
            name: 'Invitee Two',
            created_at: '2026-04-26T00:00:00Z',
            referred_by_user_id: 'user-123',
            referred_by_referral_code: 'new-user-123abc',
          },
          {
            user_id: 'invitee-3',
            referral_code: 'invitee-3-code',
            email: 'invitee3@example.com',
            name: 'Invitee Three',
            created_at: '2026-04-27T00:00:00Z',
            referred_by_user_id: 'user-123',
            referred_by_referral_code: 'new-user-123abc',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co');

    assert.equal(summary.user_id, 'user-123');
    assert.equal(summary.user_created_at, '2026-04-20T00:00:00Z');
    assert.equal(summary.referral_code, 'new-user-123abc');
    assert.equal(
      summary.referral_link,
      'https://testnet.airs.alternun.co/auth?referralCode=new-user-123abc'
    );
    assert.equal(summary.referral_count, 3);
    assert.equal(summary.referred_by_user_id, 'referrer-1');
    assert.equal(summary.referred_by_referral_code, 'edward-ref123');
    assert.equal(summary.referred_by_name, 'Referrer One');
    assert.equal(summary.referred_by_email, 'referrer@example.com');
    assert.equal(summary.referred_users.length, 3);
    assert.deepEqual(summary.referred_users[0], {
      user_id: 'invitee-3',
      referral_code: 'invitee-3-code',
      name: 'Invitee Three',
      email: 'invitee3@example.com',
      created_at: '2026-04-27T00:00:00Z',
    });
    assert.equal(calls.length, 6);
    assert.match(calls[2].url, /\/rest\/v1\/users\?id=eq\.referrer-1/);
    assert.match(calls[3].url, /\/rest\/v1\/referrals\?referrer_user_id=eq\.user-123/);
    assert.match(calls[4].url, /\/rest\/v1\/referrals\?referrer_referral_code=eq\.new-user-123abc/);
    assert.match(calls[5].url, /\/rest\/v1\/users\?or=/);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe counts users attributed by referred_by fields even without referral rows', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'edward-user',
            referral_code: 'edward-539f1d',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'edward@alternun.co',
            name: 'edward',
            created_at: '2026-05-03T17:44:56.905674Z',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([
          {
            user_id: 'edward-user',
            referral_code: 'edward-539f1d',
            email: 'edward@alternun.co',
            name: 'edward',
            created_at: '2026-05-03T17:44:56.905674Z',
            referred_by_user_id: 'edward-user',
            referred_by_referral_code: 'edward-539f1d',
          },
          {
            user_id: 'admin-user',
            referral_code: 'admin-85d11f',
            email: 'admin@alternun.co',
            name: 'admin',
            created_at: '2026-05-03T18:31:08.503623Z',
            referred_by_user_id: 'edward-user',
            referred_by_referral_code: 'edward-539f1d',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('edward-user', 'https://testnet.airs.alternun.co');

    assert.equal(summary.referral_code, 'edward-539f1d');
    assert.equal(summary.referral_count, 1);
    assert.deepEqual(summary.referred_users, [
      {
        user_id: 'admin-user',
        referral_code: 'admin-85d11f',
        name: 'admin',
        email: 'admin@alternun.co',
        created_at: '2026-05-03T18:31:08.503623Z',
      },
    ]);
    assert.equal(calls.length, 5);
    assert.match(calls[4].url, /\/rest\/v1\/users\?or=/);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe backfills a missing referral code instead of failing', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `new-user-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: null,
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'referral-1',
            user_id: 'invitee-1',
            created_at: '2026-04-25T00:00:00Z',
            referrer_user_id: 'user-123',
            referrer_referral_code: expectedReferralCode,
            referral_link: `https://testnet.airs.alternun.co/auth?referralCode=${expectedReferralCode}`,
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([
          {
            user_id: 'invitee-1',
            referral_code: 'invitee-1-code',
            email: 'invitee1@example.com',
            name: 'Invitee One',
            created_at: '2026-04-25T00:00:00Z',
          },
        ]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: expectedReferralCode,
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co');

    assert.equal(summary.referral_code, expectedReferralCode);
    assert.equal(
      summary.referral_link,
      `https://testnet.airs.alternun.co/auth?referralCode=${expectedReferralCode}`
    );
    assert.equal(calls.length, 7);
    assert.match(calls[6].url, /\/rest\/v1\/users\?id=eq\.user-123/);
    assert.deepEqual(JSON.parse(calls[6].init.body), {
      referral_code: expectedReferralCode,
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe synthesizes a referral summary when the user row is missing', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `user-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co');

    assert.equal(summary.user_id, 'user-123');
    assert.equal(summary.referral_code, expectedReferralCode);
    assert.equal(summary.referral_count, 0);
    assert.equal(summary.referred_users.length, 0);
    assert.equal(calls.length, 6);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe uses the provided display name when generating a referral code', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    const expectedSuffix = createHash('md5').update('user-123').digest('hex').slice(0, 6);
    const expectedReferralCode = `edward-calderon-${expectedSuffix}`;

    global.fetch = createFetchQueue(
      [
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe(
      'user-123',
      'https://testnet.airs.alternun.co',
      'Edward Calderon'
    );

    assert.equal(summary.referral_code, expectedReferralCode);
    assert.equal(
      summary.referral_link,
      `https://testnet.airs.alternun.co/auth?referralCode=${expectedReferralCode}`
    );
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe resolves the referrer from referred_by_referral_code when the user id is missing', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: null,
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co');

    assert.equal(summary.referred_by_user_id, 'referrer-1');
    assert.equal(summary.referred_by_referral_code, 'edward-ref123');
    assert.equal(summary.referred_by_name, 'Referrer One');
    assert.equal(summary.referred_by_email, 'referrer@example.com');
    assert.equal(calls.length, 7);
    assert.match(calls[2].url, /\/rest\/v1\/users\?referral_code=eq\.edward-ref123/);
    assert.match(calls[3].url, /\/rest\/v1\/users\?id=eq\.user-123/);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsService.getMe backfills referred_by fields from the current referral record', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.EXPO_PUBLIC_ORIGIN = 'https://testnet.airs.alternun.co';

    global.fetch = createFetchQueue(
      [
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
        createJsonResponse([
          {
            user_id: 'user-123',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            invitation_code: 'edward-ref123',
            referrer_user_id: 'referrer-1',
            referrer_referral_code: 'edward-ref123',
            referral_link: 'https://testnet.airs.alternun.co/auth?referralCode=edward-ref123',
            created_at: '2026-04-25T00:00:00Z',
          },
        ]),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
          },
        ]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([]),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
          },
        ]),
      ],
      calls
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co');

    assert.equal(summary.referred_by_user_id, 'referrer-1');
    assert.equal(summary.referred_by_referral_code, 'edward-ref123');
    assert.equal(summary.referred_by_name, 'Referrer One');
    assert.equal(summary.referred_by_email, 'referrer@example.com');
    assert.equal(calls.length, 7);
    assert.match(calls[1].url, /\/rest\/v1\/referrals\?user_id=eq\.user-123/);
    assert.match(calls[2].url, /\/rest\/v1\/users\?id=eq\.referrer-1/);
    assert.match(calls[3].url, /\/rest\/v1\/users\?id=eq\.user-123/);
    assert.deepEqual(JSON.parse(calls[3].init.body), {
      referred_by_user_id: 'referrer-1',
      referred_by_referral_code: 'edward-ref123',
    });
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
