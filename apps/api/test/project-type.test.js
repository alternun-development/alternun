const assert = require('node:assert/strict');
const test = require('node:test');

const { hasPermission } = require('../src/common/admin-auth/admin-auth.guard.ts');
const { MarketplaceApiError } = require('../src/modules/marketplace/marketplace.errors.ts');
const { ProjectTypeService } = require('../src/modules/marketplace/project-type.service.ts');
const { mapProjectType } = require('../src/modules/marketplace/project-type.repository.ts');

const PROJECT_ID = '20000000-0000-4000-8000-000000000001';

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

function build({
  types = [],
  project = { id: PROJECT_ID, enterpriseId: 'e-1', projectTypeCode: null },
} = {}) {
  const store = new Map(types.map((type) => [type.code, { ...type }]));
  const calls = { audits: [], assigned: [], created: [], updated: [] };
  const repository = {
    list: async () => [...store.values()],
    find: async (key) => store.get(key) ?? null,
    create: async (input) => {
      calls.created.push(input);
      const record = { ...input, isActive: true, sortOrder: input.sortOrder ?? 100 };
      store.set(input.code, record);
      return record;
    },
    update: async (key, input) => {
      calls.updated.push([key, input]);
      const current = store.get(key);
      if (!current) return null;
      const next = { ...current, ...input };
      store.set(key, next);
      return next;
    },
    setProjectType: async (projectId, value) => {
      calls.assigned.push([projectId, value]);
      return projectId === PROJECT_ID;
    },
  };
  const admin = {
    audit: async (entry) => calls.audits.push(entry),
    findProject: async (id) => (id === PROJECT_ID ? project : null),
  };
  return { service: new ProjectTypeService(repository, admin), calls };
}

const hotel = {
  code: 'hotel',
  labels: { en: 'Hotel' },
  requiresDocumentNumber: true,
  isActive: true,
  sortOrder: 10,
};
const operator = {
  code: 'tourism_operator',
  labels: { en: 'Tourism operator' },
  requiresDocumentNumber: false,
  isActive: true,
  sortOrder: 50,
};
const retired = { ...hotel, code: 'old_type', isActive: false };

test('every admin role can read the catalog, only Super Admins can change it', () => {
  for (const role of [
    'partner_readonly',
    'sub_admin',
    'partner_operator',
    'moderator',
    'internal_admin',
    'platform_owner',
  ]) {
    assert.equal(hasPermission(principal(role), 'project_types:read'), true, role);
  }
  for (const role of ['internal_admin', 'platform_owner']) {
    assert.equal(hasPermission(principal(role), 'project_types:manage'), true, role);
  }
  for (const role of ['partner_readonly', 'sub_admin', 'partner_operator', 'moderator']) {
    assert.equal(hasPermission(principal(role), 'project_types:manage'), false, role);
  }
});

test('anyone else is denied, and every denial is audited without touching the catalog', async () => {
  for (const role of ['partner_readonly', 'sub_admin', 'partner_operator', 'moderator']) {
    const { service, calls } = build({ types: [hotel] });
    const actor = principal(role);
    await assert.rejects(
      service.create(actor, 'r', {
        code: 'new_type',
        labels: { en: 'New' },
        requiresDocumentNumber: false,
      }),
      code('PERMISSION_DENIED', 403)
    );
    await assert.rejects(
      service.update(actor, 'r', 'hotel', { isActive: false }),
      code('PERMISSION_DENIED')
    );
    await assert.rejects(
      service.setProjectType(actor, 'r', PROJECT_ID, 'hotel'),
      code('PERMISSION_DENIED')
    );
    assert.equal(calls.created.length + calls.updated.length + calls.assigned.length, 0, role);
    assert.equal(calls.audits.length, 3, role);
    assert.ok(calls.audits.every((entry) => entry.result === 'denied'));
  }
});

test('the catalog lists active and retired types for any reader', async () => {
  const { service } = build({ types: [hotel, retired] });
  const list = await service.list(principal('sub_admin'), 'r');
  assert.deepEqual(
    list.map((type) => type.code),
    ['hotel', 'old_type']
  );
});

test('a Super Admin creates a type with a valid code and English label, and it is audited', async () => {
  const { service, calls } = build();
  const created = await service.create(principal('internal_admin'), 'r', {
    code: 'boutique_hotel',
    labels: { en: ' Boutique hotel ', es: 'Hotel boutique' },
    requiresDocumentNumber: true,
  });
  assert.deepEqual(created.labels, { en: 'Boutique hotel', es: 'Hotel boutique' });
  assert.equal(calls.audits[0].action, 'project_type.created');
  assert.equal(calls.audits[0].result, 'allowed');
});

test('codes and labels are validated: English required, locales and sizes bounded', async () => {
  const actor = principal('platform_owner');
  const base = { code: 'valid_code', labels: { en: 'Valid' }, requiresDocumentNumber: false };
  const bad = [
    { ...base, code: 'Bad Code' },
    { ...base, code: 'ab' },
    { ...base, labels: { es: 'Sin ingles' } },
    { ...base, labels: { en: '' } },
    { ...base, labels: { en: 'x'.repeat(121) } },
    { ...base, labels: { 'not a locale': 'x', en: 'ok' } },
    { ...base, labels: ['en'] },
    { ...base, labels: {} },
    { ...base, labels: null },
  ];
  for (const input of bad) {
    const { service, calls } = build();
    await assert.rejects(
      service.create(actor, 'r', input),
      code('PROJECT_TYPE_INPUT_INVALID', 400)
    );
    assert.equal(calls.created.length, 0);
  }
});

test('updating changes only what was sent, needs at least one change and reports a missing type', async () => {
  const { service, calls } = build({ types: [hotel] });
  const actor = principal('platform_owner');

  const updated = await service.update(actor, 'r', 'hotel', { requiresDocumentNumber: false });
  assert.equal(updated.requiresDocumentNumber, false);
  assert.deepEqual(calls.updated[0], ['hotel', { requiresDocumentNumber: false }]);
  assert.equal(calls.audits.at(-1).action, 'project_type.updated');

  await assert.rejects(service.update(actor, 'r', 'hotel', {}), code('PROJECT_TYPE_INPUT_INVALID'));
  await assert.rejects(
    service.update(actor, 'r', 'missing', { isActive: false }),
    code('PROJECT_TYPE_NOT_FOUND', 404)
  );
  await assert.rejects(
    service.update(actor, 'r', 'hotel', { labels: { es: 'Sin ingles' } }),
    code('PROJECT_TYPE_INPUT_INVALID')
  );
});

test('a project gets an active type, and the answer says whether the document number is required', async () => {
  const { service, calls } = build({ types: [hotel, operator] });
  const actor = principal('platform_owner');

  assert.deepEqual(await service.setProjectType(actor, 'r', PROJECT_ID, 'hotel'), {
    projectId: PROJECT_ID,
    projectTypeCode: 'hotel',
    requiresDocumentNumber: true,
  });
  assert.deepEqual(await service.setProjectType(actor, 'r', PROJECT_ID, 'tourism_operator'), {
    projectId: PROJECT_ID,
    projectTypeCode: 'tourism_operator',
    requiresDocumentNumber: false,
  });
  assert.deepEqual(calls.assigned, [
    [PROJECT_ID, 'hotel'],
    [PROJECT_ID, 'tourism_operator'],
  ]);
  assert.equal(calls.audits.at(-1).action, 'project.type_set');
  assert.deepEqual(calls.audits.at(-1).afterState, { projectTypeCode: 'tourism_operator' });
});

test('clearing the type puts the project back on the safe rule: the document number is required', async () => {
  const { service } = build({
    types: [operator],
    project: { id: PROJECT_ID, enterpriseId: 'e-1', projectTypeCode: 'tourism_operator' },
  });

  const result = await service.setProjectType(principal('platform_owner'), 'r', PROJECT_ID, null);

  assert.deepEqual(result, {
    projectId: PROJECT_ID,
    projectTypeCode: null,
    requiresDocumentNumber: true,
  });
});

test('a retired, unknown or misplaced assignment is refused and changes nothing', async () => {
  const { service, calls } = build({ types: [hotel, retired] });
  const actor = principal('platform_owner');

  await assert.rejects(
    service.setProjectType(actor, 'r', PROJECT_ID, 'old_type'),
    code('PROJECT_TYPE_INACTIVE', 422)
  );
  await assert.rejects(
    service.setProjectType(actor, 'r', PROJECT_ID, 'nope'),
    code('PROJECT_TYPE_NOT_FOUND', 404)
  );
  await assert.rejects(
    service.setProjectType(actor, 'r', '30000000-0000-4000-8000-000000000009', 'hotel'),
    code('PROJECT_NOT_FOUND', 404)
  );
  assert.equal(calls.assigned.length, 0);
});

test('a stored type maps to the API shape, defaulting to the strict rule', () => {
  assert.deepEqual(
    mapProjectType({ code: 'hotel', labels: { en: 'Hotel', es: 'Hotel', bad: 3 }, sort_order: 10 }),
    {
      code: 'hotel',
      labels: { en: 'Hotel', es: 'Hotel' },
      requiresDocumentNumber: true,
      isActive: true,
      sortOrder: 10,
    }
  );
  assert.equal(
    mapProjectType({ code: 'x', labels: {}, requires_document_number: false })
      .requiresDocumentNumber,
    false
  );
  assert.equal(mapProjectType({ code: 'x', labels: {}, is_active: false }).isActive, false);
});
