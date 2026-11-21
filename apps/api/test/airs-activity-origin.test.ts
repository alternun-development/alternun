/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import {
  describeAirsReportEntries,
  type AirsDashboardLedgerEntry,
} from '../src/modules/airs/airs.repository';

const REPORT = 'cb2f08f9-fc40-44c9-9d72-eff900f29e7d';
const EVENT_REPORT = '11111111-2222-4333-8444-555555555555';

function entry(overrides: Partial<AirsDashboardLedgerEntry>): AirsDashboardLedgerEntry {
  return {
    id: 'ledger-1',
    sourceKind: 'admin_airs_report' as AirsDashboardLedgerEntry['sourceKind'],
    sourceRef: `airs-report:${REPORT}`,
    idempotencyKey: `airs-report:${REPORT}:recipient`,
    sourceCurrency: 'USD',
    sourceAmount: null,
    airsRate: 5,
    airsDelta: 14,
    notes: null,
    metadata: { airsReportId: REPORT },
    recordedAt: '2026-11-20T00:00:00.000Z',
    createdAt: '2026-11-20T00:00:00.000Z',
    ...overrides,
  };
}

const rows = [
  {
    id: REPORT,
    project: { category_code: 'conservation' },
    medal: {
      recipe: {
        event_name: 'Comunidad Swing Golf',
        event_dates: null,
        venue_name: null,
        partner: { display_name: 'Swing Golf Colombia' },
      },
    },
  },
  {
    id: EVENT_REPORT,
    project: { category_code: 'community' },
    medal: {
      recipe: {
        event_name: 'Tour Callaway Colombia',
        event_dates: 'Noviembre 21 y 22 - 2026',
        venue_name: 'Pueblo Viejo Country Club',
        partner: { display_name: 'Swing Golf Colombia' },
      },
    },
  },
];

test('ally-report entries say what they recognize; other entries stay as they are', async () => {
  const queries: Array<Record<string, string>> = [];
  const bonus = entry({
    id: 'ledger-0',
    sourceKind: 'profile_completion_bonus',
    sourceRef: 'profile-completion-bonus',
    metadata: {},
  });
  const described = await describeAirsReportEntries(
    [
      bonus,
      entry({}),
      // Older entries carry the report id only in the reference.
      entry({ id: 'ledger-2', sourceRef: `airs-report:${EVENT_REPORT}`, metadata: {} }),
      entry({ id: 'ledger-3', sourceRef: 'airs-report:00000000-0000-4000-8000-000000000000' }),
    ],
    {},
    async (table, query) => {
      assert.equal(table, 'airs_reports');
      queries.push(query);
      return rows;
    }
  );

  assert.equal(queries.length, 1);
  assert.equal(queries[0].id, `in.(${REPORT},${EVENT_REPORT})`);
  assert.equal(described[0], bonus);
  assert.deepEqual(described[1].origin, {
    action: 'conservation',
    kind: 'community',
    partnerName: 'Swing Golf Colombia',
    eventName: 'Comunidad Swing Golf',
  });
  assert.deepEqual(described[2].origin, {
    action: 'positive_impact',
    kind: 'event',
    partnerName: 'Swing Golf Colombia',
    eventName: 'Tour Callaway Colombia',
  });
  // The metadata id wins over the reference, and an unknown report gets no origin.
  assert.equal(described[3].origin?.kind, 'community');
});

test('a report without a medal is a plain report, and a failed lookup keeps the history', async () => {
  const [plain] = await describeAirsReportEntries([entry({})], {}, async () => [
    { id: REPORT, project: { category_code: 'conservation' }, medal: null },
  ]);
  assert.deepEqual(plain.origin, {
    action: 'conservation',
    kind: 'report',
    partnerName: null,
    eventName: null,
  });

  const unchanged = [entry({})];
  const described = await describeAirsReportEntries(unchanged, {}, async () => {
    throw new Error('Supabase select airs_reports failed [500]');
  });
  assert.equal(described[0].origin, undefined);

  assert.equal(
    await describeAirsReportEntries([], {}, async () => {
      throw new Error('should not query');
    }).then((list) => list.length),
    0
  );
});
