/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
const assert = require('node:assert/strict',);
const test = require('node:test',);
const { BadRequestException, ServiceUnavailableException, } = require('@nestjs/common',);

const { ReferralsService, } = require('../src/modules/referrals/referrals.service.ts',);

function createJsonResponse(body, { status = 200, headers = {}, } = {},) {
  const normalizedHeaders = new Map(
    Object.entries(headers,).map(([key, value,],) => [key.toLowerCase(), value,],),
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'ERROR',
    headers: {
      get(name,) {
        return normalizedHeaders.get(String(name,).toLowerCase(),) ?? null;
      },
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body,);
    },
  };
}

function createFetchQueue(responses, calls,) {
  return async (url, init = {},) => {
    calls.push({ url: String(url,), init, },);
    const next = responses.shift();
    if (!next) {
      throw new Error(`Unexpected fetch call: ${String(url,)}`,);
    }

    return typeof next === 'function' ? next(url, init,) : next;
  };
}

test('ReferralsService can be constructed without Supabase env', () => {
  const originalEnv = { ...process.env, };

  try {
    delete process.env.SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    assert.doesNotThrow(() => new ReferralsService(),);
  } finally {
    process.env = originalEnv;
  }
},);

test('ReferralsService.create fails closed when Supabase is unavailable', async () => {
  const originalEnv = { ...process.env, };

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
      },),
      (error,) =>
        error instanceof ServiceUnavailableException &&
        error.getStatus() === 503 &&
        String(error.message,).includes('Supabase referrals integration is not configured',),
    );
  } finally {
    process.env = originalEnv;
  }
},);

test('ReferralsService.create resolves a referral code and stores attribution', async () => {
  const originalEnv = { ...process.env, };
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
        ],),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
          },
        ],),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'new-user-123abc',
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
          },
        ],),
        createJsonResponse([
          {
            id: 'user-123',
            user_id: 'user-123',
            referred_by_username: null,
            referred_by_email: null,
            invitation_code: 'edward-ref123',
            referrer_user_id: 'referrer-1',
            referrer_referral_code: 'edward-ref123',
            referral_link: 'https://testnet.airs.alternun.co/auth/referral?code=edward-ref123',
            created_at: '2026-04-25T00:00:00Z',
          },
        ],),
      ],
      calls,
    );

    const service = new ReferralsService();
    const response = await service.create('user-123', {
      referral_code: 'EDWARD-REF123',
      referred_by_username: 'ada',
      referred_by_email: 'ada@example.com',
    },);

    assert.equal(response.user_id, 'user-123',);
    assert.equal(response.referrer_user_id, 'referrer-1',);
    assert.equal(response.referrer_referral_code, 'edward-ref123',);
    assert.equal(response.invitation_code, 'edward-ref123',);
    assert.equal(
      response.referral_link,
      'https://testnet.airs.alternun.co/auth/referral?code=edward-ref123',
    );
    assert.equal(calls.length, 4,);
    assert.match(calls[0].url, /\/rest\/v1\/users\?id=eq\.user-123/,);
    assert.match(calls[1].url, /\/rest\/v1\/users\?referral_code=eq\.edward-ref123/,);
    assert.match(calls[2].url, /\/rest\/v1\/users\?id=eq\.user-123/,);
    assert.match(calls[3].url, /\/rest\/v1\/referrals\?on_conflict=user_id/,);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
},);

test('ReferralsService.create rejects self referrals', async () => {
  const originalEnv = { ...process.env, };
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
            referral_code: 'self-user-abcdef',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'self@example.com',
            name: 'Self User',
          },
        ],),
        createJsonResponse([
          {
            id: 'user-123',
            referral_code: 'self-user-abcdef',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'self@example.com',
            name: 'Self User',
          },
        ],),
      ],
      calls,
    );

    const service = new ReferralsService();

    await assert.rejects(
      service.create('user-123', {
        referral_code: 'SELF-USER-ABCDEF',
      },),
      (error,) => error instanceof BadRequestException && error.getStatus() === 400,
    );
    assert.equal(calls.length, 2,);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
},);

test('ReferralsService.getMe returns the canonical share link and referral count', async () => {
  const originalEnv = { ...process.env, };
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
            referred_by_user_id: 'referrer-1',
            referred_by_referral_code: 'edward-ref123',
            email: 'new@example.com',
            name: 'New User',
          },
        ],),
        createJsonResponse([], {
          headers: { 'content-range': '0-2/3', },
        },),
        createJsonResponse([
          {
            id: 'referrer-1',
            referral_code: 'edward-ref123',
            referred_by_user_id: null,
            referred_by_referral_code: null,
            email: 'referrer@example.com',
            name: 'Referrer One',
          },
        ],),
      ],
      calls,
    );

    const service = new ReferralsService();
    const summary = await service.getMe('user-123', 'https://testnet.airs.alternun.co',);

    assert.equal(summary.user_id, 'user-123',);
    assert.equal(summary.referral_code, 'new-user-123abc',);
    assert.equal(
      summary.referral_link,
      'https://testnet.airs.alternun.co/auth/referral?code=new-user-123abc',
    );
    assert.equal(summary.referral_count, 3,);
    assert.equal(summary.referred_by_user_id, 'referrer-1',);
    assert.equal(summary.referred_by_referral_code, 'edward-ref123',);
    assert.equal(summary.referred_by_name, 'Referrer One',);
    assert.equal(summary.referred_by_email, 'referrer@example.com',);
    assert.equal(calls.length, 3,);
    assert.match(calls[1].url, /\/rest\/v1\/referrals\?referrer_user_id=eq\.user-123/,);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
},);
