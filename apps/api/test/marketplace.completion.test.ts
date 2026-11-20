/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { MarketplaceActivityRepository } from '../src/modules/marketplace/marketplace-activity.repository';
import { MarketplaceActivityService } from '../src/modules/marketplace/marketplace-activity.service';
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

test('completion creation requires an active project participant', async () => {
  let creates = 0;
  const activityRepository = {
    find: async () => ({
      id: 'a1',
      projectId: 'p1',
      code: 'cleanup',
      status: 'published',
      defaultLocale: 'en',
      content: { en: { title: 'Cleanup', description: 'Help clean the beach.' } },
      defaultAirsAmount: 50,
      maxAirsPerAward: 50,
      repeatPeriod: 'none',
      maxAwardsPerPeriod: 1,
      maxAwardsLifetime: 1,
      startsAt: null,
      endsAt: null,
      createdAt: 'now',
      updatedAt: 'now',
    }),
    createCompletion: async () => {
      creates += 1;
    },
  };
  const adminRepository = {
    findProject: async () => ({ id: 'p1', enterpriseId: 'e1' }),
    audit: async () => undefined,
  };
  const participantRepository = { isActive: async () => false };
  const service = new MarketplaceActivityService(
    activityRepository as never,
    adminRepository as never,
    {} as never,
    participantRepository as never
  );

  await assert.rejects(
    service.createCompletion(
      {
        iss: 'issuer',
        aud: 'admin',
        sub: 'owner-subject',
        roles: ['platform_owner'],
        organizationIds: ['*'],
      },
      'completion-request',
      'p1',
      'a1',
      { userId: 'user-without-participation' }
    ),
    expectApiError('PARTICIPANT_REQUIRED', 409)
  );
  assert.equal(creates, 0);
});

test('nobody awards their own completion; another admin can', async () => {
  const awarded: string[] = [];
  const audits: Array<{ reasonCode?: string }> = [];
  const activityRepository = {
    findCompletion: async (_projectId: string, id: string) => ({
      id,
      projectId: 'p1',
      userId: 'user-1',
      status: 'pending',
    }),
    findCompletionUser: async () => ({
      email: 'ada@alternun.example',
      issuer: 'app-issuer',
      subject: 'app-sub',
      panelSubject: 'panel-uuid',
    }),
    awardCompletion: async (id: string) => {
      awarded.push(id);
      return { completionId: id, ledgerEntryId: 'l1', airsDelta: 40, idempotent: false };
    },
  };
  const adminRepository = {
    findProject: async () => ({ id: 'p1', enterpriseId: 'e1' }),
    audit: async (entry: { reasonCode?: string }) => void audits.push(entry),
  };
  const service = new MarketplaceActivityService(
    activityRepository as never,
    adminRepository as never,
    {} as never,
    {} as never
  );
  const admin = (over: Record<string, unknown>) => ({
    iss: 'console-issuer',
    aud: 'admin',
    sub: 'someone-else',
    roles: ['platform_owner'],
    organizationIds: ['*'],
    ...over,
  });
  const award = (principal: Record<string, unknown>, id: string) =>
    service.awardCompletion(principal as never, 'req', 'p1', id, {} as never);

  // The app session, the console identity, the same account and the same email are all "self".
  for (const self of [
    admin({ sub: 'airs-user:user-1' }),
    admin({ sub: 'panel-uuid' }),
    admin({ iss: 'app-issuer', sub: 'app-sub' }),
    admin({ email: ' ADA@alternun.example ' }),
  ]) {
    await assert.rejects(
      award(self, 'c-self'),
      expectApiError('COMPLETION_SELF_APPROVAL_DENIED', 403)
    );
  }
  assert.equal(awarded.length, 0);
  assert.ok(audits.every((entry) => entry.reasonCode === 'COMPLETION_SELF_APPROVAL_DENIED'));

  await award(admin({ email: 'other@alternun.example' }), 'c-ok');
  assert.deepEqual(awarded, ['c-ok']);
});
