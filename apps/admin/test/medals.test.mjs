import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let marketplaceErrorMessage;
let medals;
let reports;
let permissions;
let MedalEditor;

const project = { id: 'project-1', enterpriseId: 'enterprise-1' };

const medal = (overrides = {}) => ({
  id: 'm-1',
  projectId: 'project-1',
  name: 'Golf Open',
  description: null,
  imageUrl: 'https://images.example.test/golf.png',
  isActive: true,
  sortOrder: 1,
  createdAt: 'now',
  ...overrides,
});

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  medals = await viteServer.ssrLoadModule('/src/marketplace/medals.ts');
  reports = await viteServer.ssrLoadModule('/src/marketplace/airs-reports.ts');
  permissions = await viteServer.ssrLoadModule('/src/marketplace/permissions.ts');
  ({ MedalEditor } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/medal-editor.tsx'
  ));
});

after(async () => {
  await viteServer?.close();
});

test('a new medal needs a name, a short description and an https image address', () => {
  const copy = marketplaceCopy.medals.errors;
  const ok = {
    name: 'Golf Open',
    description: '',
    imageUrl: 'https://images.example.test/golf.png',
  };
  assert.deepEqual(medals.validateNewMedal(ok), {});
  assert.deepEqual(medals.validateNewMedal({ ...ok, name: '   ' }), { name: copy.name });
  assert.deepEqual(medals.validateNewMedal({ ...ok, name: 'x'.repeat(81) }), { name: copy.name });
  assert.deepEqual(medals.validateNewMedal({ ...ok, description: 'x'.repeat(301) }), {
    description: copy.description,
  });
  for (const bad of [
    '',
    'not a url',
    'http://images.example.test/a.png',
    'https://user:pass@images.example.test/a.png',
  ]) {
    assert.deepEqual(
      medals.validateNewMedal({ ...ok, imageUrl: bad }),
      { imageUrl: copy.imageUrl },
      bad
    );
  }
});

test('the create request is trimmed and leaves out an empty description', () => {
  assert.deepEqual(
    medals.buildCreateMedalBody({
      name: ' Golf Open ',
      description: '  ',
      imageUrl: ' https://images.example.test/golf.png ',
    }),
    { name: 'Golf Open', imageUrl: 'https://images.example.test/golf.png' }
  );
  assert.equal(
    medals.buildCreateMedalBody({
      name: 'Golf',
      description: ' First ',
      imageUrl: 'https://a.example.test/x.png',
    }).description,
    'First'
  );
});

test('paths are encoded, and only active medals can be picked', () => {
  assert.equal(medals.medalsPath('p 1'), '/v1/admin/projects/p%201/medals');
  assert.equal(medals.medalPath('p', 'm/1'), '/v1/admin/projects/p/medals/m%2F1');
  const list = [medal(), medal({ id: 'm-2', name: 'Old', isActive: false })];
  assert.deepEqual(
    medals.pickableMedals(list).map((item) => item.id),
    ['m-1']
  );
  assert.equal(medals.medalName(list, 'm-2'), 'Old');
  assert.equal(medals.medalName(list, 'missing'), null);
});

test('the report request carries the chosen medal and leaves it out otherwise', () => {
  const values = {
    recipientEmail: 'guest@example.test',
    recipientName: '',
    amount: '50',
    concept: 'Won the golf tournament',
    documentNumber: 'INV-1',
  };
  assert.equal('medalId' in reports.buildSubmitAirsReportBody(values, null, 'key-1'), false);
  assert.equal(reports.buildSubmitAirsReportBody(values, null, 'key-1', 'm-1').medalId, 'm-1');
});

test('only Super Admins manage medals, and others do not see the editor at all', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'medals:manage'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(permissions.hasMarketplacePermission([role], 'medals:manage'), false, role);
  }
  const admin = renderToString(createElement(MedalEditor, { project, roles: ['platform_owner'] }));
  assert.match(admin, new RegExp(marketplaceCopy.medals.heading));
  assert.match(admin, new RegExp(marketplaceCopy.medals.addHeading));
  const operator = renderToString(
    createElement(MedalEditor, { project, roles: ['partner_operator'] })
  );
  assert.equal(operator, '');
});

test('medal errors read as sentences', () => {
  for (const code of ['MEDAL_NOT_FOUND', 'MEDAL_INPUT_INVALID', 'AIRS_REPORT_MEDAL_UNAVAILABLE']) {
    const message = marketplaceErrorMessage({ code });
    assert.doesNotMatch(message, /MEDAL_/, code);
    assert.ok(message.length > 10, code);
  }
});
