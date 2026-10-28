const assert = require('node:assert/strict');
const test = require('node:test');

const { hasPermission } = require('../src/common/admin-auth/admin-auth.guard.ts');
const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const {
  MedalService,
  validateMedalImageUrl,
} = require('../src/modules/marketplace/medal.service.ts');
const { mapProjectMedal } = require('../src/modules/marketplace/medal.repository.ts');

const PROJECT_ID = '20000000-0000-4000-8000-000000000001';
const MEDAL_ID = '40000000-0000-4000-8000-000000000001';
const HOSTS = ['images.example.test'];

function principal(role) {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: ['*'],
  };
}

function code(expected, status) {
  return (error) =>
    error instanceof MarketplaceApiError &&
    error.code === expected &&
    (status === undefined || error.getStatus() === status);
}

function build({ scoped = true, medals = [] } = {}) {
  const store = new Map(medals.map((medal) => [medal.id, { ...medal }]));
  const calls = { audits: [], created: [], updated: [], listed: [] };
  const repository = {
    list: async (projectId, activeOnly) => {
      calls.listed.push([projectId, activeOnly]);
      return [...store.values()].filter((medal) => !activeOnly || medal.isActive);
    },
    find: async (_projectId, id) => store.get(id) ?? null,
    create: async (projectId, input) => {
      calls.created.push(input);
      const record = {
        id: MEDAL_ID,
        projectId,
        isActive: true,
        sortOrder: 100,
        description: null,
        ...input,
      };
      store.set(record.id, record);
      return record;
    },
    update: async (_projectId, id, input) => {
      calls.updated.push([id, input]);
      const current = store.get(id);
      if (!current) return null;
      const next = { ...current, ...input };
      store.set(id, next);
      return next;
    },
  };
  const admin = {
    audit: async (entry) => calls.audits.push(entry),
    findProject: async (id) => (id === PROJECT_ID ? { id, enterpriseId: 'e-1' } : null),
    actorHasScope: async () => scoped,
    allowedHosts: async () => HOSTS,
  };
  return { service: new MedalService(repository, admin), calls };
}

const golf = {
  id: MEDAL_ID,
  name: 'Golf Open',
  isActive: true,
  imageUrl: 'https://images.example.test/golf.png',
};
const retired = {
  ...golf,
  id: '40000000-0000-4000-8000-000000000002',
  name: 'Old Race',
  isActive: false,
};
const input = { name: ' Golf Open ', imageUrl: 'https://images.example.test/golf.png' };

test('the art must be https on an allowed host, with no credentials, IP or odd port', async () => {
  const allowed = async () => HOSTS;
  await validateMedalImageUrl('https://images.example.test/a.png', allowed);
  await validateMedalImageUrl('https://IMAGES.example.test:443/a.png', allowed);
  for (const bad of [
    'http://images.example.test/a.png',
    'https://user:pass@images.example.test/a.png',
    'https://127.0.0.1/a.png',
    'https://images.example.test:8443/a.png',
    'not a url',
  ]) {
    await assert.rejects(validateMedalImageUrl(bad, allowed), code('MEDIA_URL_INVALID', 422), bad);
  }
  await assert.rejects(
    validateMedalImageUrl('https://evil.example.test/a.png', allowed),
    code('MEDIA_HOST_NOT_ALLOWED', 422)
  );
  await assert.rejects(
    validateMedalImageUrl(`https://images.example.test/${'a'.repeat(2100)}`, allowed),
    code('MEDIA_URL_INVALID')
  );
});

test('only Super Admins manage medals', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(hasPermission(principal(role), 'medals:manage'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(hasPermission(principal(role), 'medals:manage'), false, role);
  }
});

test('everyone else is denied, audited, and nothing changes', async () => {
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    const { service, calls } = build({ medals: [golf] });
    await assert.rejects(
      service.create(principal(role), 'r', PROJECT_ID, input),
      code('PERMISSION_DENIED', 403)
    );
    await assert.rejects(
      service.update(principal(role), 'r', PROJECT_ID, MEDAL_ID, { isActive: false }),
      code('PERMISSION_DENIED')
    );
    assert.equal(calls.created.length + calls.updated.length, 0, role);
    assert.equal(calls.audits.length, 2, role);
    assert.ok(calls.audits.every((entry) => entry.result === 'denied'));
  }
});

test('the picking list shows reporters only active medals, and managers all of them', async () => {
  const { service, calls } = build({ medals: [golf, retired] });

  const reporter = await service.list(principal('sub_admin'), 'r', PROJECT_ID);
  assert.deepEqual(
    reporter.map((medal) => medal.name),
    ['Golf Open']
  );
  const manager = await service.list(principal('platform_owner'), 'r', PROJECT_ID);
  assert.deepEqual(
    manager.map((medal) => medal.name),
    ['Golf Open', 'Old Race']
  );
  assert.deepEqual(calls.listed, [
    [PROJECT_ID, true],
    [PROJECT_ID, false],
  ]);
});

test('a reporter outside the project, a read-only role and an unknown project are refused', async () => {
  const outside = build({ scoped: false });
  await assert.rejects(
    outside.service.list(principal('sub_admin'), 'r', PROJECT_ID),
    code('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(outside.calls.audits[0].reasonCode, 'PROJECT_SCOPE_DENIED');

  const readonly = build();
  await assert.rejects(
    readonly.service.list(principal('partner_readonly'), 'r', PROJECT_ID),
    code('PERMISSION_DENIED')
  );

  await assert.rejects(
    build().service.list(principal('platform_owner'), 'r', '30000000-0000-4000-8000-000000000009'),
    code('PROJECT_NOT_FOUND', 404)
  );
});

test('a Super Admin creates a medal with a trimmed name and an allowed image, audited', async () => {
  const { service, calls } = build();
  const created = await service.create(principal('internal_admin'), 'r', PROJECT_ID, input);

  assert.equal(created.name, 'Golf Open');
  assert.equal(calls.created[0].name, 'Golf Open');
  assert.equal(calls.audits[0].action, 'project_medal.created');

  await assert.rejects(
    service.create(principal('internal_admin'), 'r', PROJECT_ID, { ...input, name: '   ' }),
    code('MEDAL_INPUT_INVALID', 400)
  );
  await assert.rejects(
    service.create(principal('internal_admin'), 'r', PROJECT_ID, {
      ...input,
      description: 'x'.repeat(301),
    }),
    code('MEDAL_INPUT_INVALID')
  );
  await assert.rejects(
    service.create(principal('internal_admin'), 'r', PROJECT_ID, {
      ...input,
      imageUrl: 'https://evil.example.test/a.png',
    }),
    code('MEDIA_HOST_NOT_ALLOWED')
  );
  assert.equal(calls.created.length, 1);
});

test('updating retires or renames a medal, needs a change and reports a missing one', async () => {
  const { service, calls } = build({ medals: [golf] });
  const actor = principal('platform_owner');

  const retiredNow = await service.update(actor, 'r', PROJECT_ID, MEDAL_ID, { isActive: false });
  assert.equal(retiredNow.isActive, false);
  assert.equal(calls.audits.at(-1).action, 'project_medal.updated');

  await assert.rejects(
    service.update(actor, 'r', PROJECT_ID, MEDAL_ID, {}),
    code('MEDAL_INPUT_INVALID')
  );
  await assert.rejects(
    service.update(actor, 'r', PROJECT_ID, '40000000-0000-4000-8000-000000000099', {
      name: 'Missing',
    }),
    code('MEDAL_NOT_FOUND', 404)
  );
  await assert.rejects(
    service.update(actor, 'r', PROJECT_ID, MEDAL_ID, {
      imageUrl: 'http://images.example.test/a.png',
    }),
    code('MEDIA_URL_INVALID')
  );
});

test('a stored medal maps to the API shape', () => {
  assert.deepEqual(
    mapProjectMedal({
      id: 'm',
      project_id: 'p',
      name: 'Golf',
      image_url: 'https://x/y.png',
      sort_order: 3,
      created_at: 'now',
    }),
    {
      id: 'm',
      projectId: 'p',
      name: 'Golf',
      description: null,
      imageUrl: 'https://x/y.png',
      isActive: true,
      sortOrder: 3,
      createdAt: 'now',
    }
  );
  assert.equal(mapProjectMedal({ is_active: false }).isActive, false);
});
