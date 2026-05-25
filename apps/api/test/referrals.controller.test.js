const assert = require('node:assert/strict');
const test = require('node:test');
const { UnauthorizedException } = require('@nestjs/common');

const { ReferralsController } = require('../src/modules/referrals/referrals.controller.ts');
const { mintIssuerAccessToken } = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');

function makeRequest(origin = 'https://testnet.airs.alternun.co') {
  return {
    headers: {
      origin,
    },
  };
}

function makeToken(appUserId = 'app-user-123') {
  return mintIssuerAccessToken({
    issuer: 'alternun-api',
    audience: 'alternun',
    principal: {
      subject: 'principal-123',
      email: 'ada@example.com',
      roles: ['authenticated'],
      metadata: {
        emailVerified: true,
        appUserId,
      },
    },
    claims: {},
    signingKey: 'test-signing-key',
  }).token;
}

function createJsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test('ReferralsController.getMe resolves the authenticated user from bearer token app_user_id', async () => {
  const originalEnv = { ...process.env };
  let observedUserId = null;
  let observedOrigin = null;

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';
    const controller = new ReferralsController({
      getMe(userId, requestedOrigin) {
        observedUserId = userId;
        observedOrigin = requestedOrigin;
        return Promise.resolve({
          user_id: userId,
          referral_code: 'ada-123abc',
          referral_link: `${requestedOrigin}/auth?referralCode=ada-123abc`,
          referral_count: 0,
          referred_by_user_id: null,
          referred_by_referral_code: null,
          referred_by_name: null,
          referred_by_email: null,
        });
      },
    });

    const summary = await controller.getMe(makeRequest(), `Bearer ${makeToken('app-user-123')}`);

    assert.equal(observedUserId, 'app-user-123');
    assert.equal(observedOrigin, 'https://testnet.airs.alternun.co');
    assert.equal(summary.user_id, 'app-user-123');
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsController.getMe resolves email users from a Supabase bearer token', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let observedUserId = null;
  let observedAuthUrl = null;
  let observedAuthorization = null;

  try {
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    global.fetch = async (url, init = {}) => {
      observedAuthUrl = String(url);
      observedAuthorization = init.headers?.Authorization;
      return createJsonResponse({
        id: 'supabase-user-123',
        email: 'ada@example.com',
      });
    };

    const controller = new ReferralsController({
      getMe(userId, requestedOrigin) {
        observedUserId = userId;
        return Promise.resolve({
          user_id: userId,
          referral_code: 'ada-123abc',
          referral_link: `${requestedOrigin}/auth?referralCode=ada-123abc`,
          referral_count: 0,
          referred_by_user_id: null,
          referred_by_referral_code: null,
          referred_by_name: null,
          referred_by_email: null,
        });
      },
    });

    const summary = await controller.getMe(makeRequest(), 'Bearer supabase-access-token');

    assert.equal(observedUserId, 'supabase-user-123');
    assert.equal(observedAuthUrl, 'https://supabase.example/auth/v1/user');
    assert.equal(observedAuthorization, 'Bearer supabase-access-token');
    assert.equal(summary.user_id, 'supabase-user-123');
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('ReferralsController.getMe falls back to a user_id query parameter when no bearer token is available', async () => {
  const originalEnv = { ...process.env };
  let observedUserId = null;

  try {
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;

    const controller = new ReferralsController({
      getMe(userId, requestedOrigin) {
        observedUserId = userId;
        return Promise.resolve({
          user_id: userId,
          referral_code: 'ada-123abc',
          referral_link: `${requestedOrigin}/auth?referralCode=ada-123abc`,
          referral_count: 0,
          referred_by_user_id: null,
          referred_by_referral_code: null,
          referred_by_name: null,
          referred_by_email: null,
          referred_users: [],
        });
      },
    });

    const summary = await controller.getMe(makeRequest(), undefined, 'supabase-user-456');

    assert.equal(observedUserId, 'supabase-user-456');
    assert.equal(summary.user_id, 'supabase-user-456');
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsController.getMe forwards a display_name query parameter to the referrals service', async () => {
  const originalEnv = { ...process.env };
  let observedDisplayName = null;

  try {
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;

    const controller = new ReferralsController({
      getMe(userId, requestedOrigin, displayName) {
        observedDisplayName = displayName;
        return Promise.resolve({
          user_id: userId,
          referral_code: 'edward-123abc',
          referral_link: `${requestedOrigin}/auth?referralCode=edward-123abc`,
          referral_count: 0,
          referred_by_user_id: null,
          referred_by_referral_code: null,
          referred_by_name: null,
          referred_by_email: null,
          referred_users: [],
        });
      },
    });

    await controller.getMe(makeRequest(), undefined, 'supabase-user-456', 'Edward');

    assert.equal(observedDisplayName, 'Edward');
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsController.create falls back to a user_id body field when no bearer token is available', async () => {
  const originalEnv = { ...process.env };
  let observedUserId = null;
  let observedReferralCode = null;

  try {
    delete process.env.AUTHENTIK_JWT_SIGNING_KEY;
    delete process.env.AUTHENTIK_JWT_SIGNING_SECRET;
    delete process.env.AUTH_SESSION_SIGNING_KEY;

    const controller = new ReferralsController({
      create(userId, dto) {
        observedUserId = userId;
        observedReferralCode = dto.referral_code ?? null;
        return Promise.resolve({
          id: 'referral-1',
          user_id: userId,
          referred_by_username: null,
          referred_by_email: null,
          invitation_code: dto.referral_code ?? null,
          referrer_user_id: null,
          referrer_referral_code: dto.referral_code ?? null,
          referral_link: `${makeRequest().headers.origin}/auth?referralCode=${
            dto.referral_code ?? ''
          }`,
          created_at: '2026-04-25T00:00:00Z',
        });
      },
    });

    const response = await controller.create(
      { referral_code: 'edward-ref123' },
      makeRequest(),
      undefined,
      'supabase-user-456'
    );

    assert.equal(observedUserId, 'supabase-user-456');
    assert.equal(observedReferralCode, 'edward-ref123');
    assert.equal(response.user_id, 'supabase-user-456');
  } finally {
    process.env = originalEnv;
  }
});

test('ReferralsController.getMe rejects requests without a bearer token or request user', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';
    const controller = new ReferralsController({
      getMe() {
        throw new Error('service should not be called');
      },
    });

    await assert.rejects(
      controller.getMe(makeRequest(), undefined),
      (error) => error instanceof UnauthorizedException && error.getStatus() === 401
    );
  } finally {
    process.env = originalEnv;
  }
});
