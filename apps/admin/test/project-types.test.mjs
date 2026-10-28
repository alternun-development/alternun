import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let marketplaceErrorMessage;
let types;
let reports;
let permissions;
let ProjectTypeEditor;

const project = { id: 'project-1', enterpriseId: 'enterprise-1', projectTypeCode: null };

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  types = await viteServer.ssrLoadModule('/src/marketplace/project-types.ts');
  reports = await viteServer.ssrLoadModule('/src/marketplace/airs-reports.ts');
  permissions = await viteServer.ssrLoadModule('/src/marketplace/permissions.ts');
  ({ ProjectTypeEditor } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/project-type-editor.tsx'
  ));
});

after(async () => {
  await viteServer?.close();
});

test('a type code is built from the English name: no accents, lowercase, underscores', () => {
  assert.equal(types.projectTypeCodeFromName('Boutique hotel'), 'boutique_hotel');
  assert.equal(types.projectTypeCodeFromName('  Café & Bar  '), 'cafe_bar');
  assert.equal(types.projectTypeCodeFromName('Eco-lodge'), 'eco_lodge');
  assert.equal(types.projectTypeCodeFromName('24h Gym'), 'type_24h_gym');
  assert.equal(types.projectTypeCodeFromName('x'.repeat(100)).length, 64);
  assert.match(types.projectTypeCodeFromName('Boutique hotel'), /^[a-z][a-z0-9_]{2,63}$/);
});

test('a new type needs an English name that makes a valid code, and short names', () => {
  const copy = marketplaceCopy.projectTypes.errors;
  const ok = { nameEn: 'Boutique hotel', nameEs: 'Hotel boutique', requiresDocumentNumber: true };
  assert.deepEqual(types.validateNewProjectType(ok), {});
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEs: '' }), {});
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEn: '   ' }), { nameEn: copy.nameEn });
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEn: '!!' }), { nameEn: copy.nameEn });
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEn: 'ab' }), { nameEn: copy.nameEn });
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEn: 'x'.repeat(121) }), {
    nameEn: copy.nameEn,
  });
  assert.deepEqual(types.validateNewProjectType({ ...ok, nameEs: 'x'.repeat(121) }), {
    nameEs: copy.nameEs,
  });
});

test('the create request carries the code, the labels and the document rule', () => {
  assert.deepEqual(
    types.buildCreateProjectTypeBody({
      nameEn: ' Boutique hotel ',
      nameEs: ' Hotel boutique ',
      requiresDocumentNumber: false,
    }),
    {
      code: 'boutique_hotel',
      labels: { en: 'Boutique hotel', es: 'Hotel boutique' },
      requiresDocumentNumber: false,
    }
  );
  assert.deepEqual(
    types.buildCreateProjectTypeBody({ nameEn: 'Cafe', nameEs: '', requiresDocumentNumber: true })
      .labels,
    { en: 'Cafe' }
  );
});

test('paths are encoded and labels fall back to English and then to the code', () => {
  assert.equal(types.projectTypesPath, '/v1/admin/project-types');
  assert.equal(types.projectTypePath('a/b'), '/v1/admin/project-types/a%2Fb');
  assert.equal(types.projectTypeAssignmentPath('p 1'), '/v1/admin/projects/p%201/type');
  const type = { code: 'hotel', labels: { en: 'Hotel', es: 'Hotel (es)' } };
  assert.equal(types.projectTypeLabel(type, 'es'), 'Hotel (es)');
  assert.equal(types.projectTypeLabel(type, 'th'), 'Hotel');
  assert.equal(types.projectTypeLabel({ code: 'x', labels: {} }), 'x');
});

test('active types come first in their order and retired ones last', () => {
  const sorted = types.sortProjectTypes([
    { code: 'old', labels: {}, isActive: false, sortOrder: 1, requiresDocumentNumber: true },
    { code: 'b', labels: {}, isActive: true, sortOrder: 20, requiresDocumentNumber: true },
    { code: 'a', labels: {}, isActive: true, sortOrder: 20, requiresDocumentNumber: true },
    { code: 'first', labels: {}, isActive: true, sortOrder: 5, requiresDocumentNumber: true },
  ]);
  assert.deepEqual(
    sorted.map((type) => type.code),
    ['first', 'a', 'b', 'old']
  );
});

test('the report form asks for the document number unless the project type says otherwise', () => {
  const values = {
    recipientEmail: 'guest@example.test',
    recipientName: 'Guest',
    amount: '50',
    concept: 'Two nights at the pilot hotel',
    documentNumber: '',
  };
  const required = marketplaceCopy.airsReports.errors.documentRequired;
  assert.deepEqual(reports.validateAirsReportForm(values, null), { documentNumber: required });
  assert.deepEqual(reports.validateAirsReportForm(values, null, { documentRequired: true }), {
    documentNumber: required,
  });
  assert.deepEqual(reports.validateAirsReportForm(values, null, { documentRequired: false }), {});
  // A number that is too long is refused even when it is optional.
  assert.ok(
    reports.validateAirsReportForm({ ...values, documentNumber: 'x'.repeat(81) }, null, {
      documentRequired: false,
    }).documentNumber
  );
});

test('the request leaves the document number out when it is empty', () => {
  const values = {
    recipientEmail: 'guest@example.test',
    recipientName: '',
    amount: '50',
    concept: 'Two nights at the pilot hotel',
    documentNumber: '',
  };
  const without = reports.buildSubmitAirsReportBody(values, null, 'key-1');
  assert.equal('documentNumber' in without, false);
  const withNumber = reports.buildSubmitAirsReportBody(
    { ...values, documentNumber: ' INV-1 ' },
    null,
    'key-1'
  );
  assert.equal(withNumber.documentNumber, 'INV-1');
});

test('only Super Admins can manage project types', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'project_types:manage'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'project_types:manage'), false, role);
  }
});

test('the project type control is enabled for Super Admins and explains the rule to others', () => {
  const admin = renderToString(
    createElement(ProjectTypeEditor, { project, roles: ['platform_owner'], onChanged: () => {} })
  );
  assert.match(admin, new RegExp(marketplaceCopy.projectTypes.projectType));
  assert.match(admin, new RegExp(marketplaceCopy.projectTypes.none));
  assert.match(admin, new RegExp(marketplaceCopy.projectTypes.documentRequiredNoType));
  assert.doesNotMatch(admin, new RegExp(marketplaceCopy.projectTypes.assignPermission));

  const operator = renderToString(
    createElement(ProjectTypeEditor, { project, roles: ['partner_operator'], onChanged: () => {} })
  );
  assert.match(operator, /<select[^>]*disabled/);
  assert.match(operator, new RegExp(marketplaceCopy.projectTypes.assignPermission));
});

test('project type errors read as sentences, not codes', () => {
  for (const code of [
    'PROJECT_TYPE_NOT_FOUND',
    'PROJECT_TYPE_CONFLICT',
    'PROJECT_TYPE_INPUT_INVALID',
    'PROJECT_TYPE_INACTIVE',
  ]) {
    const message = marketplaceErrorMessage({ code });
    assert.doesNotMatch(message, /PROJECT_TYPE/, code);
    assert.ok(message.length > 10, code);
  }
});
