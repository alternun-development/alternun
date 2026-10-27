/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import {
  MarketplaceAdminRepository,
  type MarketplacePublicRepository,
} from '../src/modules/marketplace/marketplace.repository';
import {
  MarketplaceAdminService,
  MarketplacePublicService,
} from '../src/modules/marketplace/marketplace.service';
import type { AuditInput } from '../src/modules/marketplace/marketplace.types';

const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];

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

function adminRepository() {
  const audits: AuditInput[] = [];
  const calls: string[] = [];
  const repository = {
    audit: async (input: AuditInput) => {
      audits.push(input);
    },
    reorderEnterprises: async (order: readonly string[]) => {
      calls.push(`enterprises:${order.join(',')}`);
    },
    reorderProjects: async (order: readonly string[]) => {
      calls.push(`projects:${order.join(',')}`);
    },
    listEnterprises: async () => [],
    listProjects: async () => [],
  };
  return { repository: repository as unknown as MarketplaceAdminRepository, audits, calls };
}

test('global admins reorder enterprises and projects', async () => {
  const { repository, calls } = adminRepository();
  const service = new MarketplaceAdminService(repository);
  for (const role of ['platform_owner', 'internal_admin']) {
    await service.reorderEnterprises(principal(role), `e-${role}`, { ids });
    await service.reorderProjects(principal(role), `p-${role}`, { ids });
  }
  assert.deepEqual(calls, [
    `enterprises:${ids.join(',')}`,
    `projects:${ids.join(',')}`,
    `enterprises:${ids.join(',')}`,
    `projects:${ids.join(',')}`,
  ]);
});

test('scoped and moderator roles cannot reorder the marketplace, and the denial is audited', async () => {
  const { repository, audits, calls } = adminRepository();
  const service = new MarketplaceAdminService(repository);
  const roles = ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly'];
  for (const role of roles) {
    await assert.rejects(
      service.reorderEnterprises(principal(role), `e-${role}`, { ids }),
      expectApiError('PERMISSION_DENIED', 403)
    );
    await assert.rejects(
      service.reorderProjects(principal(role), `p-${role}`, { ids }),
      expectApiError('PERMISSION_DENIED', 403)
    );
  }
  assert.deepEqual(calls, []);
  assert.equal(audits.filter(({ result }) => result === 'denied').length, roles.length * 2);
});

test('reorder calls the audited RPC and maps a rejected order to 422', async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let reply: Record<string, unknown> = { ok: true, order: ids };
  const repository = new MarketplaceAdminRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return { data: reply, error: null };
    },
  } as never);
  const actor = { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] };
  await repository.reorderEnterprises(ids, actor, 'order-1');
  await repository.reorderProjects(ids, actor, 'order-2');
  assert.deepEqual(
    rpcCalls.map(({ name }) => name),
    ['marketplace_reorder_enterprises', 'marketplace_reorder_projects']
  );
  assert.deepEqual(rpcCalls[0].args.p_ids, ids);
  assert.equal(rpcCalls[1].args.p_request_id, 'order-2');
  reply = { ok: false, reasonCode: 'SORT_ORDER_INVALID' };
  await assert.rejects(
    repository.reorderProjects(ids, actor, 'order-3'),
    expectApiError('SORT_ORDER_INVALID', 422)
  );
});

test('the public enterprise directory follows the enterprise sort order', async () => {
  const row = (id: string, displayName: string, sortOrder: number) => ({
    enterprise: {
      id,
      slug: id,
      displayName,
      legalName: null,
      status: 'active',
      countryCode: 'CO',
      websiteUrl: null,
      sortOrder,
      createdAt: 'now',
      updatedAt: 'now',
    },
    project: {
      id: `project-${id}`,
      enterpriseId: id,
      slug: `project-${id}`,
      status: 'published',
      categoryCode: 'other',
      countryCode: 'CO',
      timeZone: 'America/Bogota',
      defaultLocale: 'en',
      content: {
        en: {
          title: displayName,
          location: 'Colombia',
          theme: 'Theme',
          description: 'Description',
          waysToContribute: ['Visit'],
        },
      },
      firstPublishedAt: 'now',
      publishedAt: 'now',
      sortOrder: 0,
      createdAt: 'now',
      updatedAt: 'now',
    },
    media: [],
  });
  const service = new MarketplacePublicService({
    listPublished: async () => [
      row('alpha', 'Alpha', 2),
      row('bravo', 'Bravo', 0),
      row('charlie', 'Charlie', 1),
    ],
  } as unknown as MarketplacePublicRepository);
  const page = await service.listEnterprises('en');
  assert.deepEqual(
    page.data.map((enterprise) => enterprise.slug),
    ['bravo', 'charlie', 'alpha']
  );
});
