/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceMembershipRepository } from '../src/modules/marketplace/marketplace-membership.repository';
import { MarketplaceMembershipService } from '../src/modules/marketplace/marketplace-membership.service';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import type { MarketplaceAdminRepository } from '../src/modules/marketplace/marketplace.repository';
import type {
  EnterpriseRecord,
  ProjectMembershipRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const enterprise: EnterpriseRecord = {
  id: '10000000-0000-4000-8000-000000000001',
  slug: 'enterprise',
  displayName: 'Enterprise',
  legalName: null,
  status: 'active',
  countryCode: 'CO',
  websiteUrl: null,
  createdAt: 'now',
  updatedAt: 'now',
};
const project: ProjectRecord = {
  id: '20000000-0000-4000-8000-000000000001',
  enterpriseId: enterprise.id,
  slug: 'project',
  status: 'draft',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'es',
  content: {},
  firstPublishedAt: null,
  publishedAt: null,
  createdAt: 'now',
  updatedAt: 'now',
};
const membership: ProjectMembershipRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  member: { issuer: 'issuer', subject: 'member-subject' },
  memberUserId: null,
  enterpriseId: enterprise.id,
  projectId: project.id,
  scopeType: 'project',
  role: 'sub_admin',
  status: 'active',
  grantedBy: { issuer: 'issuer', subject: 'owner-subject' },
  createdAt: 'now',
  updatedAt: 'now',
  revokedAt: null,
};

function principal(role: string, subject = `${role}-subject`): AdminPrincipal {
  return { iss: 'issuer', aud: 'admin', sub: subject, roles: [role], organizationIds: ['*'] };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

function repositories(
  options: {
    actorHasScope?: boolean;
    actorMemberships?: Array<{
      enterpriseId: string;
      projectId: string | null;
      scopeType: 'enterprise' | 'project';
      role: 'partner_operator' | 'sub_admin' | 'partner_readonly';
    }>;
    current?: ProjectMembershipRecord | null;
  } = {}
) {
  const calls = { grants: [] as unknown[][], changes: [] as unknown[][], lists: [] as unknown[][] };
  const membershipRepository = {
    list: async (...args: unknown[]) => {
      calls.lists.push(args);
      return [membership];
    },
    find: async () => (options.current === undefined ? membership : options.current),
    grant: async (...args: unknown[]) => {
      calls.grants.push(args);
      return membership;
    },
    change: async (...args: unknown[]) => {
      calls.changes.push(args);
      return membership;
    },
  } as unknown as MarketplaceMembershipRepository;
  const adminRepository = {
    audit: async () => undefined,
    actorHasScope: async () => options.actorHasScope ?? true,
    listActorMemberships: async () =>
      options.actorMemberships ?? [
        {
          enterpriseId: enterprise.id,
          projectId: project.id,
          scopeType: 'project',
          role: 'sub_admin',
        },
      ],
    findEnterprise: async (id: string) => (id === enterprise.id ? enterprise : null),
    findProject: async (id: string) => (id === project.id ? project : null),
  } as unknown as MarketplaceAdminRepository;
  return {
    service: new MarketplaceMembershipService(membershipRepository, adminRepository),
    calls,
  };
}

function grantInput(role: 'partner_operator' | 'sub_admin' | 'partner_readonly') {
  return {
    member: { issuer: 'issuer', subject: 'other-subject' },
    enterpriseId: enterprise.id,
    projectId: project.id,
    scopeType: 'project' as const,
    role,
  };
}

test('membership delegation allowlist is enforced in the API', async () => {
  const partner = repositories();
  await partner.service.grant(principal('partner_operator'), 'request-1', grantInput('sub_admin'));
  await partner.service.grant(
    principal('partner_operator'),
    'request-2',
    grantInput('partner_readonly')
  );
  assert.equal(partner.calls.grants.length, 2);
  await assert.rejects(
    partner.service.grant(
      principal('partner_operator'),
      'request-3',
      grantInput('partner_operator')
    ),
    expectApiError('ROLE_ESCALATION_DENIED', 403)
  );

  for (const role of ['sub_admin', 'partner_readonly', 'moderator']) {
    await assert.rejects(
      repositories().service.grant(principal(role), 'request-4', grantInput('sub_admin')),
      expectApiError('PERMISSION_DENIED', 403)
    );
  }

  for (const role of ['platform_owner', 'internal_admin']) {
    const global = repositories();
    await global.service.grant(principal(role), 'request-5', grantInput('partner_operator'));
    assert.equal(global.calls.grants.length, 1);
  }

  await assert.rejects(
    repositories().service.grant(principal('platform_owner'), 'request-6', {
      ...grantInput('sub_admin'),
      role: 'internal_admin' as never,
    }),
    expectApiError('ROLE_ESCALATION_DENIED', 403)
  );
});

test('self changes and out-of-scope grants fail before the membership RPC', async () => {
  const self = repositories();
  await assert.rejects(
    self.service.grant(
      principal('partner_operator', 'other-subject'),
      'request-1',
      grantInput('sub_admin')
    ),
    expectApiError('SELF_MEMBERSHIP_CHANGE_DENIED', 403)
  );
  await assert.rejects(
    self.service.change(
      principal('partner_operator', membership.member.subject),
      'request-2',
      membership.id,
      {
        role: 'partner_readonly',
      }
    ),
    expectApiError('SELF_MEMBERSHIP_CHANGE_DENIED', 403)
  );
  assert.equal(self.calls.grants.length, 0);
  assert.equal(self.calls.changes.length, 0);

  const denied = repositories({ actorHasScope: false });
  await assert.rejects(
    denied.service.grant(principal('partner_operator'), 'request-3', grantInput('sub_admin')),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(denied.calls.grants.length, 0);
});

test('non-global membership lists are constrained to active actor membership scopes', async () => {
  const scoped = repositories({
    actorMemberships: [
      {
        enterpriseId: enterprise.id,
        projectId: project.id,
        scopeType: 'project',
        role: 'sub_admin',
      },
    ],
  });
  await scoped.service.list(principal('sub_admin'), 'request-1', {});
  assert.deepEqual(scoped.calls.lists[0], [{}, { enterpriseIds: [], projectIds: [project.id] }]);

  const global = repositories();
  await global.service.list(principal('platform_owner'), 'request-2', {});
  assert.deepEqual(global.calls.lists[0], [{}]);
});

test('PATCH fills the current role and revoke invokes one atomic change', async () => {
  const patch = repositories();
  await patch.service.change(principal('partner_operator'), 'request-1', membership.id, {
    status: 'active',
  });
  assert.equal(patch.calls.changes[0][1], membership.role);

  const revoke = repositories();
  await revoke.service.revoke(
    principal('partner_operator'),
    'request-2',
    membership.id,
    'No longer assigned'
  );
  assert.equal(revoke.calls.changes.length, 1);
  assert.deepEqual(revoke.calls.changes[0].slice(0, 3), [
    membership.id,
    membership.role,
    'revoked',
  ]);
});

test('membership RPC reasonCode maps to the standard API error and is called once', async () => {
  const rpcCalls: unknown[][] = [];
  const client = {
    rpc: async (...args: unknown[]) => {
      rpcCalls.push(args);
      return { data: { ok: false, reasonCode: 'MEMBERSHIP_CONFLICT' }, error: null };
    },
  };
  const repository = new MarketplaceMembershipRepository(client as never);
  await assert.rejects(
    repository.grant(
      {
        memberIssuer: 'issuer',
        memberSubject: 'other-subject',
        enterpriseId: enterprise.id,
        projectId: project.id,
        scopeType: 'project',
        role: 'sub_admin',
      },
      { issuer: 'issuer', subject: 'owner-subject', roles: ['partner_operator'] },
      'request-1'
    ),
    expectApiError('MEMBERSHIP_CONFLICT', 409)
  );
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0][0], 'marketplace_grant_project_membership');
});
