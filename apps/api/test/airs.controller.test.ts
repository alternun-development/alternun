/* eslint-disable */
const assert = require('node:assert/strict');
const test = require('node:test');
const { UnauthorizedException } = require('@nestjs/common');
const { mintIssuerAccessToken } = require('../src/modules/auth-exchange/auth-exchange-jwt.ts');

const { AirsController } = require('../src/modules/airs/airs.controller.ts');

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

test('AirsController.activity forwards query scope and source kind to the service', async () => {
  const originalEnv = { ...process.env };
  const calls = [];

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';

    const service = {
      async leaderboard() {
        return {
          entries: [],
          requestingUserEntry: null,
          totalEligibleUsers: 0,
          page: 1,
          pageSize: 7,
          totalPages: 1,
        };
      },
      async activity(_token, input) {
        calls.push(input);
        return {
          entries: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        };
      },
    };

    const controller = new AirsController(service);
    const result = await controller.activity(
      `Bearer ${makeToken()}`,
      'global',
      2,
      11,
      'term',
      'allied_commerce'
    );

    assert.equal(calls[0].scope, 'global');
    assert.equal(calls[0].page, 2);
    assert.equal(calls[0].limit, 11);
    assert.equal(calls[0].search, 'term');
    assert.equal(calls[0].sourceKind, 'allied_commerce');
    assert.equal(result.totalPages, 1);
  } finally {
    process.env = originalEnv;
  }
});

test('AirsController.activity converts unknown source kind to null and normalizes to personal scope', async () => {
  const originalEnv = { ...process.env };
  const calls = [];

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';

    const service = {
      async leaderboard() {
        return {
          entries: [],
          requestingUserEntry: null,
          totalEligibleUsers: 0,
          page: 1,
          pageSize: 7,
          totalPages: 1,
        };
      },
      async activity(_token, input) {
        calls.push(input);
        return {
          entries: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        };
      },
    };

    const controller = new AirsController(service);

    const result = await controller.activity(
      `Bearer ${makeToken()}`,
      'city',
      1,
      10,
      undefined,
      'not-a-valid-kind'
    );

    assert.equal(calls[0].scope, 'personal');
    assert.equal(calls[0].sourceKind, null);
    assert.equal(result.totalCount, 0);
  } finally {
    process.env = originalEnv;
  }
});

test('AirsController methods reject missing bearer authorization', async () => {
  const originalEnv = { ...process.env };

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';

    const controller = new AirsController({
      leaderboard: () =>
        Promise.resolve({
          entries: [],
          requestingUserEntry: null,
          totalEligibleUsers: 0,
          page: 1,
          pageSize: 7,
          totalPages: 1,
        }),
      activity: () =>
        Promise.resolve({
          entries: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        }),
    });

    await assert.rejects(
      controller.leaderboard('', 7, 1),
      (error) => error instanceof UnauthorizedException
    );

    await assert.rejects(
      controller.activity('', 'global', 1, 10),
      (error) => error instanceof UnauthorizedException
    );
  } finally {
    process.env = originalEnv;
  }
});

test('AirsController.leaderboard forwards user-visible pagination', async () => {
  const originalEnv = { ...process.env };
  let observed;

  try {
    process.env.AUTH_SESSION_SIGNING_KEY = 'test-signing-key';

    const controller = new AirsController({
      async leaderboard(_token, limit, page) {
        observed = { limit, page };
        return {
          entries: [],
          requestingUserEntry: null,
          totalEligibleUsers: 1,
          page,
          pageSize: limit,
          totalPages: 1,
        };
      },
    });

    await controller.leaderboard(`Bearer ${makeToken()}`, 5, 3);

    assert.deepEqual(observed, {
      limit: 5,
      page: 3,
    });
  } finally {
    process.env = originalEnv;
  }
});
