/* eslint-disable */
const assert = require('node:assert/strict');
const test = require('node:test');

const { AirsService } = require('../src/modules/airs/airs.service.ts');

function createJsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
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

test('AirsService.leaderboard resolves the leaderboard page from RPC payload', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.AUTH_BETTER_AUTH_URL = 'https://auth.example';

    global.fetch = createFetchQueue(
      [
        createJsonResponse({
          user: {
            id: 'user-123',
          },
        }),
        createJsonResponse([
          {
            rank: 1,
            user_id: 'user-123',
            display_name: 'Ada',
            airs_balance: 50,
            airs_lifetime_earned: 80,
            is_me: true,
          },
        ]),
        createJsonResponse([
          {
            count: 8,
          },
        ]),
      ],
      calls
    );

    const service = new AirsService();
    const response = await service.leaderboard('Bearer session-token', 7, 2);

    assert.equal(response.page, 2);
    assert.equal(response.pageSize, 7);
    assert.equal(response.totalPages, 2);
    assert.equal(response.totalEligibleUsers, 8);
    assert.equal(response.requestingUserEntry?.userId, 'user-123');
    assert.equal(calls.length, 3);
    assert.equal(
      JSON.parse(calls[1].init.body).p_limit,
      7,
      'leaderboard RPC should use the requested limit'
    );
    assert.equal(JSON.parse(calls[1].init.body).p_page, 2);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('AirsService.activity applies filters and maps RPC payload', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.AUTH_BETTER_AUTH_URL = 'https://auth.example';

    global.fetch = createFetchQueue(
      [
        createJsonResponse({
          user: {
            id: 'user-123',
          },
        }),
        createJsonResponse({
          total_count: 11,
          page: 2,
          page_size: 5,
          entries: [
            {
              id: 'entry-1',
              source_kind: 'compensation',
              source_ref: 'action-1',
              idempotency_key: 'idem-1',
              source_currency: 'USD',
              source_amount: null,
              airs_rate: 5,
              airs_delta: 12,
              notes: 'Compensation payout',
              metadata: { source: 'project' },
              recorded_at: '2026-08-09T12:00:00.000Z',
              created_at: '2026-08-09T12:00:00.000Z',
            },
          ],
        }),
      ],
      calls
    );

    const service = new AirsService();
    const response = await service.activity('Bearer session-token', {
      scope: 'global',
      page: 2,
      limit: 5,
      search: 'carbon',
      sourceKind: 'compensation',
    });

    assert.equal(response.page, 2);
    assert.equal(response.pageSize, 5);
    assert.equal(response.totalPages, 3);
    assert.equal(response.totalCount, 11);
    assert.equal(response.entries.length, 1);
    assert.equal(response.entries[0].id, 'entry-1');
    assert.equal(response.entries[0].sourceKind, 'compensation');
    assert.equal(response.entries[0].sourceRef, 'action-1');
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[1].init.body).p_limit, 5);
    assert.equal(JSON.parse(calls[1].init.body).p_page, 2);
    assert.equal(JSON.parse(calls[1].init.body).p_search, 'carbon');
    assert.equal(JSON.parse(calls[1].init.body).p_source_kind, 'compensation');
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
