import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let marketplaceErrorMessage;
let marketplaceCopy;
let MarketplaceRequestError;
let loadProjectDetail;
let projectReadiness;
let isValidSlug;
let resolveDefaultTimeZone;
let slugFromName;
let validateProjectStep;
let hasMarketplacePermission;
let projectStatusActions;
let completionActionAvailability;

const project = {
  id: 'project-1',
  enterpriseId: 'enterprise-1',
  slug: 'hotel-project',
  status: 'draft',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'en',
  content: {
    en: {
      title: 'Forest Hotel',
      location: 'Colombia',
      theme: 'Regeneration',
      description: 'A stay connected to the forest.',
      waysToContribute: ['Join an activity'],
    },
  },
};
const enterprise = {
  id: 'enterprise-1',
  displayName: 'Forest Hotel',
  status: 'active',
  countryCode: 'CO',
  websiteUrl: null,
};
const media = [
  {
    id: 'logo-1',
    projectId: project.id,
    kind: 'logo',
    url: 'https://images.example/logo.png',
    embedUrl: null,
    altText: { en: 'Forest Hotel logo' },
    caption: {},
    sortOrder: 0,
    isActive: true,
  },
  {
    id: 'cover-1',
    projectId: project.id,
    kind: 'cover',
    url: 'https://images.example/cover.png',
    embedUrl: null,
    altText: { en: 'Forest Hotel' },
    caption: {},
    sortOrder: 1,
    isActive: true,
  },
];
const activities = [
  {
    id: 'activity-1',
    projectId: project.id,
    status: 'published',
    defaultLocale: 'en',
    content: { en: { title: 'Forest walk', description: 'A guided walk.' } },
    defaultAirsAmount: 5,
  },
];
const memberships = [{ id: 'membership-1', role: 'sub_admin', status: 'active' }];

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  ({ MarketplaceRequestError } = await viteServer.ssrLoadModule('/src/marketplace/api.ts'));
  ({ loadProjectDetail, projectReadiness } = await viteServer.ssrLoadModule(
    '/src/marketplace/project-detail-model.ts'
  ));
  ({ isValidSlug, resolveDefaultTimeZone, slugFromName, validateProjectStep } =
    await viteServer.ssrLoadModule('/src/pages/marketplace/project-create-wizard.tsx'));
  ({ hasMarketplacePermission } = await viteServer.ssrLoadModule(
    '/src/marketplace/permissions.ts'
  ));
  ({ projectStatusActions } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/project-status-actions.tsx'
  ));
  ({ completionActionAvailability } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/approval-inbox.tsx'
  ));
});

after(async () => {
  await viteServer?.close();
});

function simulatedGet(overrides = {}) {
  return async (path) => {
    if (path === `/v1/admin/projects/${project.id}`) return project;
    if (path === `/v1/admin/enterprises/${enterprise.id}`) return enterprise;
    if (path === `/v1/admin/projects/${project.id}/media`) return overrides.media ?? media;
    if (path === `/v1/admin/projects/${project.id}/activities`)
      return overrides.activities ?? activities;
    if (path === `/v1/admin/projects/${project.id}/activities/${activities[0].id}/completions`)
      return overrides.completions ?? [];
    if (path === `/v1/admin/project-memberships?projectId=${project.id}`)
      return overrides.memberships ?? memberships;
    throw new Error(`Unexpected test path: ${path}`);
  };
}

void test('marketplace API errors always become friendly copy', () => {
  assert.equal(
    marketplaceErrorMessage({ code: 'ENTERPRISE_SCOPE_DENIED', statusCode: 403 }),
    "You don't have access to this enterprise."
  );
  assert.equal(
    marketplaceErrorMessage({ code: 'AN_UNKNOWN_CODE', statusCode: 500 }),
    'Something went wrong. Please try again.'
  );
  assert.equal(
    marketplaceErrorMessage({ code: 'PROJECT_STATUS_TRANSITION_INVALID', statusCode: 409 }),
    'This project status change is not available.'
  );
});

void test('project creation wizard generates a safe slug and validates each step', () => {
  const draft = {
    name: 'Hotel Bosque Mágico',
    slug: slugFromName('Hotel Bosque Mágico'),
    categoryCode: 'hospitality_ecotourism',
    enterpriseId: '',
    location: '',
    timeZone: 'America/Bogota',
    defaultLocale: 'es',
    theme: '',
    description: '',
    contribution: '',
  };
  assert.equal(draft.slug, 'hotel-bosque-magico');
  assert.equal(slugFromName('---Hotel---Bosque---'), 'hotel-bosque');
  assert.equal(isValidSlug('hotel--bosque'), false);
  assert.equal(isValidSlug('-hotel'), false);
  assert.equal(isValidSlug('hotel-'), false);
  assert.equal(resolveDefaultTimeZone('Asia/Bangkok'), 'Asia/Bangkok');
  assert.equal(resolveDefaultTimeZone('Europe/Madrid'), 'UTC');
  assert.deepEqual(Object.keys(validateProjectStep(draft, 1)), ['enterpriseId']);
  assert.deepEqual(Object.keys(validateProjectStep(draft, 2)), ['location']);
  assert.deepEqual(Object.keys(validateProjectStep(draft, 3)), [
    'theme',
    'description',
    'contribution',
  ]);
});

void test('a disallowed status action is disabled with a friendly reason', () => {
  assert.equal(hasMarketplacePermission(['sub_admin'], 'projects:publish'), false);
  assert.equal(
    marketplaceCopy.permissions.changeStatus,
    'Only Alternun platform administrators can change project status.'
  );
});

void test('pause and archive confirmations explain the effect and require a reason', () => {
  for (const action of ['pause', 'archive']) {
    assert.equal(projectStatusActions[action].requiresReason, true);
    assert.ok(projectStatusActions[action].effect.length > 20);
  }
});

void test('approval inbox exposes Approve and Reject by role and Reverse only to platform owner', () => {
  assert.deepEqual(completionActionAvailability(['partner_operator']), {
    approve: true,
    reject: true,
    reverse: false,
  });
  assert.deepEqual(completionActionAvailability(['platform_owner']), {
    approve: true,
    reject: true,
    reverse: true,
  });
});

void test('project detail loads successful sections and a complete publishing checklist', async () => {
  const detail = await loadProjectDetail(simulatedGet(), project.id);
  assert.equal(detail.enterprise.kind, 'success');
  assert.equal(detail.media.kind, 'success');
  assert.equal(detail.activities.kind, 'success');
  assert.equal(detail.memberships.kind, 'success');
  assert.deepEqual(projectReadiness(project, media, activities), [
    { key: 'title', complete: true },
    { key: 'description', complete: true },
    { key: 'logo', complete: true },
    { key: 'cover', complete: true },
    { key: 'activity', complete: true },
  ]);
});

void test('project detail preserves useful empty sections and missing readiness items', async () => {
  const detail = await loadProjectDetail(
    simulatedGet({ media: [], activities: [], memberships: [] }),
    project.id
  );
  assert.deepEqual(detail.media, { kind: 'success', data: [] });
  assert.deepEqual(detail.activities, { kind: 'success', data: [] });
  assert.deepEqual(detail.memberships, { kind: 'success', data: [] });
  assert.deepEqual(
    projectReadiness(project, [], [])
      .filter((item) => !item.complete)
      .map((item) => item.key),
    ['logo', 'cover', 'activity']
  );
});

void test('a forbidden section does not hide the rest of project detail', async () => {
  const forbidden = new MarketplaceRequestError(403, 'PROJECT_SCOPE_DENIED');
  const get = simulatedGet();
  const detail = await loadProjectDetail(async (path) => {
    if (path.endsWith('/media') || path.includes('project-memberships')) throw forbidden;
    return get(path);
  }, project.id);
  assert.deepEqual(detail.media, { kind: 'forbidden' });
  assert.deepEqual(detail.memberships, { kind: 'forbidden' });
  assert.equal(detail.enterprise.kind, 'success');
  assert.equal(detail.activities.kind, 'success');
});
