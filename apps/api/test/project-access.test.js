const assert = require('node:assert/strict');
const test = require('node:test');

const { hasPermission } = require('../src/common/admin-auth/admin-auth.guard.ts');
const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const {
  ProjectAccessRepository,
  ProjectAccessService,
  mapProjectAccessGap,
} = require('../src/modules/marketplace/project-access.ts');

function principal(role) {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: ['*'],
  };
}

const gap = { projectId: 'p-1', slug: 'eco-turismo', missingAccount: true, missingAdmin: false };

function build() {
  const audits = [];
  const service = new ProjectAccessService(
    { gaps: async () => [gap] },
    { audit: async (entry) => audits.push(entry) }
  );
  return { service, audits };
}

test('only Super Admins can see the access gaps', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(hasPermission(principal(role), 'project_access:read'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(hasPermission(principal(role), 'project_access:read'), false, role);
  }
});

test('a Super Admin gets the gaps; anyone else is refused and the refusal is audited', async () => {
  const allowed = build();
  assert.deepEqual(await allowed.service.gaps(principal('internal_admin'), 'r'), [gap]);
  assert.equal(allowed.audits.length, 0);

  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    const { service, audits } = build();
    await assert.rejects(
      service.gaps(principal(role), 'r'),
      (error) =>
        error instanceof MarketplaceApiError &&
        error.code === 'PERMISSION_DENIED' &&
        error.getStatus() === 403,
      role
    );
    assert.equal(audits[0].result, 'denied', role);
    assert.equal(audits[0].targetType, 'project_access', role);
  }
});

test('the database rows map to the API shape, and a failure is a storage error', async () => {
  assert.deepEqual(
    mapProjectAccessGap({
      project_id: 'p-1',
      slug: 'eco-turismo',
      missing_account: true,
      missing_admin: false,
    }),
    gap
  );
  assert.deepEqual(mapProjectAccessGap({}), {
    projectId: '',
    slug: '',
    missingAccount: false,
    missingAdmin: false,
  });

  const ok = new ProjectAccessRepository({
    rpc: async (name) => {
      assert.equal(name, 'marketplace_projects_missing_account_or_admin');
      return {
        data: [
          { project_id: 'p-1', slug: 'eco-turismo', missing_account: true, missing_admin: true },
        ],
        error: null,
      };
    },
  });
  assert.equal((await ok.gaps())[0].missingAdmin, true);

  const broken = new ProjectAccessRepository({
    rpc: async () => ({ data: null, error: { code: 'XX000' } }),
  });
  await assert.rejects(
    broken.gaps(),
    (error) => error instanceof MarketplaceApiError && error.getStatus() === 503
  );
});
