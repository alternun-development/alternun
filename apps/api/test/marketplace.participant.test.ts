/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import { MarketplaceParticipantRepository } from '../src/modules/marketplace/marketplace-participant.repository';
import { MarketplaceParticipantService } from '../src/modules/marketplace/marketplace-participant.service';

const project = {
  id: '20000000-0000-4000-8000-000000000001',
  enterpriseId: '10000000-0000-4000-8000-000000000001',
};
const participant = {
  id: '30000000-0000-4000-8000-000000000001',
  projectId: project.id,
  userId: '40000000-0000-4000-8000-000000000001',
  displayName: 'Verified Guest',
  email: 'guest@example.test',
  status: 'active' as const,
  addedAt: '2026-10-16T12:00:00.000Z',
  removedAt: null,
  completedActivities: 3,
  receivedAirs: 150,
};

function principal(role: string): AdminPrincipal {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: [],
  };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

function fixture(scope = true) {
  const calls = { lists: 0, histories: [] as unknown[][], removes: 0, scopes: 0 };
  const participantRepository = {
    list: async () => {
      calls.lists += 1;
      return [participant];
    },
    find: async () => ({ id: participant.id, user_id: participant.userId }),
    add: async () => participant,
    remove: async () => {
      calls.removes += 1;
      return { id: participant.id, status: 'removed' as const, removedAt: 'now' };
    },
    history: async (...args: unknown[]) => {
      calls.histories.push(args);
      return [
        {
          id: 'completion-1',
          activityId: 'activity-1',
          activity: 'Beach cleanup',
          status: 'awarded' as const,
          awardedAirs: 50,
          completedAt: '2026-10-16T12:00:00.000Z',
          awardedAt: '2026-10-16T13:00:00.000Z',
          rejectedAt: null,
          reversedAt: null,
        },
      ];
    },
  };
  const adminRepository = {
    findProject: async () => project,
    actorHasScope: async () => {
      calls.scopes += 1;
      return scope;
    },
    audit: async () => undefined,
  };
  return {
    calls,
    service: new MarketplaceParticipantService(
      participantRepository as never,
      adminRepository as never
    ),
  };
}

test('participant PII is returned only after role and membership authorization', async () => {
  for (const role of ['moderator', 'partner_readonly']) {
    const denied = fixture();
    await assert.rejects(
      denied.service.list(principal(role), 'request-denied', project.id),
      expectApiError('PERMISSION_DENIED', 403)
    );
    assert.equal(denied.calls.lists, 0);
  }

  const outOfScope = fixture(false);
  await assert.rejects(
    outOfScope.service.list(principal('sub_admin'), 'request-scope', project.id),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(outOfScope.calls.lists, 0);

  const allowed = fixture(true);
  const result = await allowed.service.list(
    principal('partner_operator'),
    'request-allowed',
    project.id
  );
  assert.equal(result[0]?.email, participant.email);
  assert.equal(allowed.calls.scopes, 1);
});

test('participant RPC reason codes map to standard API errors', async () => {
  for (const [reasonCode, status] of [
    ['PARTICIPANT_CONFLICT', 409],
    ['USER_NOT_FOUND', 404],
  ] as const) {
    const repository = new MarketplaceParticipantRepository({
      rpc: async () => ({ data: { ok: false, reasonCode }, error: null }),
    } as never);
    await assert.rejects(
      repository.add(
        project.id,
        participant.email,
        { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] },
        `request-${reasonCode}`
      ),
      expectApiError(reasonCode, status)
    );
  }
});

test('removal requires a reason and participant history stays inside the project', async () => {
  const target = fixture();
  await assert.rejects(
    target.service.remove(
      principal('platform_owner'),
      'request-remove',
      project.id,
      participant.id,
      '   '
    ),
    expectApiError('PARTICIPANT_REASON_REQUIRED', 422)
  );
  assert.equal(target.calls.removes, 0);

  const history = await target.service.history(
    principal('platform_owner'),
    'request-history',
    project.id,
    participant.id
  );
  assert.equal(history[0]?.activity, 'Beach cleanup');
  assert.equal(history[0]?.awardedAirs, 50);
  assert.deepEqual(target.calls.histories[0], [project.id, participant.userId]);
});
