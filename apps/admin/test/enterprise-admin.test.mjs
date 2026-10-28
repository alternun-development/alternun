import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let hasMarketplacePermission;
let editor;
let statusActions;
let auditQueryPath;
let adminResources;

const enterprise = {
  id: 'enterprise-1',
  slug: 'forest-hotel',
  displayName: 'Forest Hotel',
  legalName: 'Forest Hotel SAS',
  status: 'active',
  countryCode: 'CO',
  websiteUrl: 'https://forest.example.test',
};

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy } = await viteServer.ssrLoadModule('/src/marketplace/copy.ts'));
  ({ hasMarketplacePermission } = await viteServer.ssrLoadModule(
    '/src/marketplace/permissions.ts'
  ));
  editor = await viteServer.ssrLoadModule('/src/pages/marketplace/editors/enterprise-editor.tsx');
  statusActions = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/enterprise-status-actions.tsx'
  );
  ({ auditQueryPath } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/audit-history.tsx'
  ));
  ({ adminResources } = await viteServer.ssrLoadModule('/src/resources/catalog.ts'));
});

after(async () => {
  await viteServer?.close();
});

void test('only global admins create enterprises or change their status', () => {
  for (const role of ['platform_owner', 'internal_admin']) {
    assert.equal(hasMarketplacePermission([role], 'enterprises:create'), true, role);
    assert.equal(hasMarketplacePermission([role], 'enterprises:status'), true, role);
    assert.equal(hasMarketplacePermission([role], 'enterprises:update'), true, role);
  }
  for (const role of ['moderator', 'partner_operator', 'sub_admin', 'partner_readonly']) {
    assert.equal(hasMarketplacePermission([role], 'enterprises:create'), false, role);
    assert.equal(hasMarketplacePermission([role], 'enterprises:status'), false, role);
  }
  assert.equal(hasMarketplacePermission(['partner_operator'], 'enterprises:update'), true);
  assert.equal(hasMarketplacePermission(['sub_admin'], 'enterprises:update'), false);
  assert.equal(hasMarketplacePermission(['moderator'], 'enterprises:update'), false);
});

void test('enterprise create body trims values and omits empty optional fields', () => {
  const draft = { ...editor.enterpriseDraft(), displayName: ' New Co ', slug: 'new-co' };
  assert.deepEqual(editor.validateEnterpriseDraft(draft), {});
  assert.deepEqual(editor.enterpriseCreateBody(draft), { displayName: 'New Co', slug: 'new-co' });
  assert.deepEqual(
    editor.enterpriseCreateBody({ ...draft, countryCode: 'CO', websiteUrl: 'https://x.test' }),
    { displayName: 'New Co', slug: 'new-co', countryCode: 'CO', websiteUrl: 'https://x.test' }
  );
});

void test('enterprise validation rejects bad slug, country, website, and cleared values', () => {
  const copy = marketplaceCopy.enterpriseForm.validation;
  assert.deepEqual(
    editor.validateEnterpriseDraft({
      displayName: ' ',
      slug: 'No',
      legalName: '',
      countryCode: 'col',
      websiteUrl: 'http://insecure.test',
    }),
    { displayName: copy.name, slug: copy.slug, countryCode: copy.country, websiteUrl: copy.website }
  );
  const cleared = { ...editor.enterpriseDraft(enterprise), legalName: '', countryCode: '', websiteUrl: '' };
  assert.deepEqual(editor.validateEnterpriseDraft(cleared, enterprise), {
    legalName: copy.cannotClear,
    countryCode: copy.cannotClear,
    websiteUrl: copy.cannotClear,
  });
  // The slug is fixed after creation, so editing never validates it.
  assert.deepEqual(
    editor.validateEnterpriseDraft({ ...editor.enterpriseDraft(enterprise), slug: '' }, enterprise),
    {}
  );
});

void test('enterprise patch sends only changed fields and the legal name only for global admins', () => {
  const draft = { ...editor.enterpriseDraft(enterprise), displayName: 'Renamed', legalName: 'New SAS' };
  assert.deepEqual(editor.enterpriseUpdatePatch(enterprise, editor.enterpriseDraft(enterprise), ['platform_owner']), {});
  assert.deepEqual(editor.enterpriseUpdatePatch(enterprise, draft, ['internal_admin']), {
    displayName: 'Renamed',
    legalName: 'New SAS',
  });
  assert.deepEqual(editor.enterpriseUpdatePatch(enterprise, draft, ['partner_operator']), {
    displayName: 'Renamed',
  });
  assert.equal(editor.canEditLegalName(['partner_operator']), false);
  assert.equal(editor.canEditLegalName(['internal_admin']), true);
});

void test('enterprise status actions follow the lifecycle and require a reason to stop', () => {
  assert.deepEqual(statusActions.availableEnterpriseActions('active'), ['pause', 'archive']);
  assert.deepEqual(statusActions.availableEnterpriseActions('paused'), ['resume', 'archive']);
  assert.deepEqual(statusActions.availableEnterpriseActions('archived'), []);
  const actions = statusActions.enterpriseStatusActions;
  assert.equal(actions.pause.target, 'paused');
  assert.equal(actions.resume.target, 'active');
  assert.equal(actions.archive.target, 'archived');
  assert.equal(actions.pause.requiresReason, true);
  assert.equal(actions.archive.requiresReason, true);
  assert.equal(actions.resume.requiresReason, false);
});

void test('enterprise audit reads the enterprise endpoint and the list is in the navigation', () => {
  assert.equal(
    auditQueryPath('enterprise-1', 'changes', 1, 'enterprises'),
    '/v1/admin/enterprises/enterprise-1/audit?page=1&perPage=20&result=allowed'
  );
  assert.equal(
    auditQueryPath('project-1', 'all', 1),
    '/v1/admin/projects/project-1/audit?page=1&perPage=20'
  );
  const resource = adminResources.find((entry) => entry.name === 'marketplace-enterprises');
  assert.equal(resource.list, '/marketplace/enterprises');
  assert.notEqual(resource.showInNavigation, false);
});
