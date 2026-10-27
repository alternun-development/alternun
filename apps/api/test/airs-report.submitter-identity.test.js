const assert = require('node:assert/strict');
const test = require('node:test');

const { AirsReportRepository } = require('../src/modules/marketplace/airs-report.repository.ts');

function fakeClient(row) {
  const calls = [];
  const query = {
    select: () => query,
    or: (filter) => (calls.push(['or', filter]), query),
    eq: (...args) => (calls.push(['eq', ...args]), query),
    limit: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  return { calls, client: { from: () => query } };
}

const ISSUER = 'https://sso.example.test/application/o/alternun-admin/';
const AUTHENTIK_UUID = 'c0ffee00-0000-4000-8000-000000000002';

test('the submitter email is found by issuer and subject or by the Authentik UUID', async () => {
  const { client, calls } = fakeClient({ email: ' Ada@Example.test ' });
  const repository = new AirsReportRepository(client);

  assert.equal(await repository.findSubmitterEmail(ISSUER, AUTHENTIK_UUID), 'Ada@Example.test');
  assert.deepEqual(calls, [
    [
      'or',
      `and(iss.eq."${ISSUER}",sub.eq."${AUTHENTIK_UUID}"),raw_claims->>uuid.eq."${AUTHENTIK_UUID}"`,
    ],
    ['eq', 'email_verified', true],
  ]);
});

test('an identity that cannot be a filter value is never queried', async () => {
  const { client, calls } = fakeClient({ email: 'ada@example.test' });
  const repository = new AirsReportRepository(client);

  assert.equal(await repository.findSubmitterEmail(ISSUER, 'x"),sub.neq.('), null);
  assert.deepEqual(calls, []);
});
