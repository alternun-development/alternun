/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import {
  sanitizeAuditRow,
  shortActorIdentifier,
} from '../src/modules/marketplace/marketplace-audit.repository';
import { MarketplaceAuditService } from '../src/modules/marketplace/marketplace-audit.service';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';

const project = {
  id: '20000000-0000-4000-8000-000000000001',
  enterpriseId: '10000000-0000-4000-8000-000000000001',
};

function principal(role: string): AdminPrincipal {
  return {
    iss: 'https://identity.example.test/application/admin/',
    aud: 'admin',
    sub: `${role}-subject-with-long-identifier`,
    roles: [role],
    organizationIds: [],
  };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

function fixture(scope = true) {
  const calls = {
    project: [] as unknown[][],
    enterprise: [] as unknown[][],
    scopes: [] as unknown[][],
    denials: 0,
  };
  const page = { data: [], page: 1, perPage: 20, total: 0, hasMore: false };
  const repository = {
    listProject: async (...args: unknown[]) => {
      calls.project.push(args);
      return page;
    },
    listEnterprise: async (...args: unknown[]) => {
      calls.enterprise.push(args);
      return page;
    },
  };
  const adminRepository = {
    findProject: async () => project,
    findEnterprise: async () => ({ id: project.enterpriseId }),
    actorHasScope: async (...args: unknown[]) => {
      calls.scopes.push(args);
      return scope;
    },
    audit: async () => {
      calls.denials += 1;
    },
  };
  return {
    calls,
    service: new MarketplaceAuditService(repository as never, adminRepository as never),
  };
}

test('project audit requires the role and active project membership scope', async () => {
  const allowed = fixture(true);
  await allowed.service.listProject(principal('partner_operator'), 'request-allowed', project.id, {
    action: 'completion.approved',
    result: 'allowed',
  });
  assert.equal(allowed.calls.project.length, 1);
  assert.equal(allowed.calls.scopes.length, 1);
  assert.deepEqual(allowed.calls.scopes[0]?.[4], ['partner_operator']);

  const outOfScope = fixture(false);
  await assert.rejects(
    outOfScope.service.listProject(principal('partner_operator'), 'request-scope', project.id, {}),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(outOfScope.calls.project.length, 0);

  const forbidden = fixture();
  await assert.rejects(
    forbidden.service.listProject(principal('sub_admin'), 'request-forbidden', project.id, {}),
    expectApiError('PERMISSION_DENIED', 403)
  );
  assert.equal(forbidden.calls.project.length, 0);
});

test('global roles skip project membership and enterprise history rejects scoped roles', async () => {
  const global = fixture(false);
  await global.service.listProject(principal('moderator'), 'request-global', project.id, {});
  assert.equal(global.calls.scopes.length, 0);
  assert.equal(global.calls.project.length, 1);

  const scoped = fixture(true);
  await assert.rejects(
    scoped.service.listEnterprise(
      principal('partner_operator'),
      'request-enterprise',
      project.enterpriseId,
      {}
    ),
    expectApiError('PERMISSION_DENIED', 403)
  );
  assert.equal(scoped.calls.enterprise.length, 0);

  await global.service.listEnterprise(
    principal('internal_admin'),
    'request-enterprise-global',
    project.enterpriseId,
    {}
  );
  assert.equal(global.calls.enterprise.length, 1);
});

test('audit filters are preserved and pagination is capped at fifty', async () => {
  const target = fixture();
  await target.service.listProject(principal('platform_owner'), 'request-filters', project.id, {
    action: ' project.updated ',
    result: 'denied',
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-16T23:59:59.000Z',
    page: 3,
    perPage: 500,
  });
  assert.deepEqual(target.calls.project[0]?.[2], {
    action: 'project.updated',
    result: 'denied',
    from: '2026-10-01T00:00:00.000Z',
    to: '2026-10-16T23:59:59.000Z',
    page: 3,
    perPage: 50,
  });

  await assert.rejects(
    target.service.listProject(principal('platform_owner'), 'request-dates', project.id, {
      from: '2026-10-17T00:00:00.000Z',
      to: '2026-10-16T00:00:00.000Z',
    }),
    expectApiError('VALIDATION_FAILED', 400)
  );
});

test('sanitized audit rows never expose issuers, state values, emails, or comment contents', () => {
  const raw = {
    id: 'audit-1',
    occurred_at: '2026-10-16T12:00:00.000Z',
    actor_issuer: 'https://identity.example.test/application/admin/',
    actor_subject: 'actor-subject-with-long-identifier',
    action: 'comment.moderated',
    target_type: 'comment',
    result: 'allowed',
    reason_code: null,
    before_state: {
      email: 'private@example.test',
      body: 'Private comment contents before moderation',
      status: 'pending',
    },
    after_state: {
      email: 'changed@example.test',
      body: 'Private comment contents after moderation',
      status: 'visible',
    },
  };
  const output = sanitizeAuditRow(raw, 'admin@example.test');
  const serialized = JSON.stringify(output);
  assert.equal(serialized.includes(raw.actor_issuer), false);
  assert.equal(serialized.includes(raw.actor_subject), false);
  assert.equal(serialized.includes('private@example.test'), false);
  assert.equal(serialized.includes('Private comment contents'), false);
  assert.equal(output.actor, shortActorIdentifier(raw.actor_subject));
  assert.deepEqual(output.changedFields, ['body', 'email', 'status']);
});
