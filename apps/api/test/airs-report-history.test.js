const assert = require('node:assert/strict');
const test = require('node:test');

const { AirsReportRepository } = require('../src/modules/marketplace/airs-report.repository.ts');
const { AirsReportService } = require('../src/modules/marketplace/airs-report.service.ts');

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';

// A query builder that records the filters and answers with fixed rows.
function fakeClient(tables) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, filters: [], order: null, limit: null };
      calls.push(call);
      const builder = {
        select: () => builder,
        eq: (column, value) => (call.filters.push(['eq', column, value]), builder),
        like: (column, value) => (call.filters.push(['like', column, value]), builder),
        order: (column, options) => ((call.order = [column, options]), builder),
        limit: (count) => ((call.limit = count), builder),
        then: (resolve) => resolve({ data: tables[table] ?? [], error: null }),
      };
      return builder;
    },
  };
}

test('the timeline asks only for this report and returns no actor identity', async () => {
  const client = fakeClient({
    admin_audit_log: [
      {
        action: 'airs_report.submitted',
        result: 'allowed',
        reason_code: null,
        occurred_at: '2026-10-27T12:00:00Z',
        actor_subject: 'must-not-leak',
      },
      {
        action: 'airs_report.approve_denied',
        result: 'denied',
        reason_code: 'AIRS_REPORT_SELF_APPROVAL_DENIED',
        occurred_at: '2026-10-27T12:05:00Z',
      },
    ],
  });

  const timeline = await new AirsReportRepository(client).listTimeline(REPORT_ID);

  assert.deepEqual(timeline, [
    {
      action: 'airs_report.submitted',
      result: 'allowed',
      reasonCode: null,
      occurredAt: '2026-10-27T12:00:00Z',
    },
    {
      action: 'airs_report.approve_denied',
      result: 'denied',
      reasonCode: 'AIRS_REPORT_SELF_APPROVAL_DENIED',
      occurredAt: '2026-10-27T12:05:00Z',
    },
  ]);
  assert.doesNotMatch(JSON.stringify(timeline), /must-not-leak/);
  const [call] = client.calls;
  assert.equal(call.table, 'admin_audit_log');
  assert.deepEqual(call.filters, [
    ['eq', 'target_type', 'airs_report'],
    ['eq', 'target_id', REPORT_ID],
    ['like', 'action', 'airs_report.%'],
  ]);
  assert.deepEqual(call.order, ['occurred_at', { ascending: true }]);
  assert.equal(call.limit, 100);
});

test('rewards show their kind, amount and status for this report only', async () => {
  const client = fakeClient({
    airs_report_rewards: [
      { kind: 'project', amount: 5, status: 'credited', credited_at: '2026-10-27T13:00:00Z' },
      { kind: 'submitter', amount: 5, status: 'locked', credited_at: null },
      { kind: 'submitter', amount: 5, status: 'unexpected', credited_at: null },
    ],
  });

  const rewards = await new AirsReportRepository(client).listRewards(REPORT_ID);

  assert.deepEqual(rewards, [
    { kind: 'project', amount: 5, status: 'credited', creditedAt: '2026-10-27T13:00:00Z' },
    { kind: 'submitter', amount: 5, status: 'locked', creditedAt: null },
    { kind: 'submitter', amount: 5, status: 'locked', creditedAt: null },
  ]);
  assert.deepEqual(client.calls[0].filters, [['eq', 'report_id', REPORT_ID]]);
});

const report = {
  id: REPORT_ID,
  projectId: PROJECT_ID,
  recipientEmail: 'guest@example.test',
  submittedAt: '2026-10-27T12:00:00Z',
};
const totals = { dailyTotal: 10 };
const principal = { iss: 'issuer', aud: 'admin', sub: 'owner', roles: ['platform_owner'] };

function service(repositoryOverrides = {}) {
  const repository = {
    find: async () => report,
    isApprover: async () => false,
    recipientTotals: async () => totals,
    listTimeline: async () => [
      { action: 'airs_report.submitted', result: 'allowed', reasonCode: null, occurredAt: 'x' },
    ],
    listRewards: async () => [{ kind: 'project', amount: 5, status: 'locked', creditedAt: null }],
    ...repositoryOverrides,
  };
  const admin = { audit: async () => undefined, findProject: async () => null };
  return new AirsReportService(
    repository,
    admin,
    async () => {},
    async () => {}
  );
}

test('the detail brings the report, totals, history and rewards together', async () => {
  const detail = await service().detail(principal, 'req-1', REPORT_ID);

  assert.equal(detail.report, report);
  assert.equal(detail.recipientTotals, totals);
  assert.equal(detail.timeline.length, 1);
  assert.deepEqual(detail.rewards, [
    { kind: 'project', amount: 5, status: 'locked', creditedAt: null },
  ]);
});

test('a history that cannot be read never stops the report from opening', async () => {
  const detail = await service({
    listTimeline: async () => {
      throw new Error('audit table unavailable');
    },
    listRewards: async () => {
      throw new Error('rewards table unavailable');
    },
  }).detail(principal, 'req-1', REPORT_ID);

  assert.equal(detail.report, report);
  assert.deepEqual(detail.timeline, []);
  assert.deepEqual(detail.rewards, []);
});
