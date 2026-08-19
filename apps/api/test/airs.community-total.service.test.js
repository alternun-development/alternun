const assert = require('node:assert/strict');
const test = require('node:test');
const { AirsService } = require('../src/modules/airs/airs.service.ts');

function createJsonResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

test('AirsService.communityTotal returns the public accumulated AIRS total without a user session', async () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const calls = [];

  try {
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    global.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return createJsonResponse([{ total_airs: '1250.5', updated_at: '2026-08-19T12:00:00.000Z' }]);
    };

    const result = await new AirsService().communityTotal();

    assert.deepEqual(result, {
      totalAirs: 1250.5,
      updatedAt: '2026-08-19T12:00:00.000Z',
    });
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      'https://supabase.example/rest/v1/rpc/airs_get_community_total'
    );
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
