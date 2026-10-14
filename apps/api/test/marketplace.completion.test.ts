/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { MarketplaceActivityRepository } from '../src/modules/marketplace/marketplace-activity.repository';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';

const actor = {
  issuer: 'issuer',
  subject: 'owner-subject',
  roles: ['platform_owner'],
};

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

test('award and reverse delegate to their SQL RPC exactly once', async () => {
  const calls: Array<{ name: string; parameters: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, parameters: Record<string, unknown>) => {
      calls.push({ name, parameters });
      return name === 'marketplace_approve_activity_completion'
        ? {
            data: {
              ok: true,
              idempotent: false,
              completionId: 'c1',
              ledgerEntryId: 'l1',
              airsDelta: 5,
            },
            error: null,
          }
        : {
            data: {
              ok: true,
              idempotent: false,
              completionId: 'c1',
              reversalLedgerEntryId: 'l2',
              airsDelta: -5,
            },
            error: null,
          };
    },
  };
  const repository = new MarketplaceActivityRepository(client as never);
  const award = await repository.awardCompletion('c1', actor, 'award-request', 'approved');
  const reversal = await repository.reverseCompletion('c1', actor, 'reverse-request', 'mistake');
  assert.equal(award.ledgerEntryId, 'l1');
  assert.equal(reversal.reversalLedgerEntryId, 'l2');
  assert.deepEqual(
    calls.map(({ name }) => name),
    ['marketplace_approve_activity_completion', 'marketplace_reverse_activity_completion']
  );
  assert.equal(calls.filter(({ name }) => name.includes('approve')).length, 1);
  assert.equal(calls.filter(({ name }) => name.includes('reverse')).length, 1);
});

test('completion RPC reasonCode maps to the contract HTTP error', async () => {
  let calls = 0;
  const repository = new MarketplaceActivityRepository({
    rpc: async () => {
      calls += 1;
      return {
        data: { ok: false, reasonCode: 'ACTIVITY_AWARD_LIMIT_REACHED' },
        error: null,
      };
    },
  } as never);
  await assert.rejects(
    repository.awardCompletion('c1', actor, 'award-request'),
    expectApiError('ACTIVITY_AWARD_LIMIT_REACHED', 409)
  );
  assert.equal(calls, 1);
});
