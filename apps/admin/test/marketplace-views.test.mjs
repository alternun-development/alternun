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
let commentActionAvailability;
let commentReasonError;
let commentsForStatus;
let participantActionAvailability;
let participantRemovalReasonError;
let participantHistoryPath;
let auditFilterResult;
let auditQueryPath;
let auditEventMessage;
let toSafeMediaUrl;
let mediaUrlError;
let mediaHostNotAllowedMessage;

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
const comments = [
  {
    id: 'comment-1',
    projectId: project.id,
    authorDisplayName: 'Guest One',
    body: 'A thoughtful visit.',
    status: 'pending',
    moderationReason: null,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
  },
  {
    id: 'comment-2',
    projectId: project.id,
    authorDisplayName: 'Guest Two',
    body: 'Already visible.',
    status: 'visible',
    moderationReason: null,
    createdAt: '2026-10-14T12:00:00.000Z',
    updatedAt: '2026-10-14T12:00:00.000Z',
  },
];
const participants = [
  {
    id: 'participant-1',
    projectId: project.id,
    userId: 'user-1',
    displayName: 'Guest One',
    email: 'guest@example.test',
    status: 'active',
    addedAt: '2026-10-16T12:00:00.000Z',
    removedAt: null,
    completedActivities: 3,
    receivedAirs: 150,
  },
];

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
  ({ commentActionAvailability, commentReasonError, commentsForStatus } =
    await viteServer.ssrLoadModule('/src/pages/marketplace/editors/comment-moderation-queue.tsx'));
  ({ participantActionAvailability, participantRemovalReasonError, participantHistoryPath } =
    await viteServer.ssrLoadModule('/src/pages/marketplace/editors/participant-editor.tsx'));
  ({ auditFilterResult, auditQueryPath, auditEventMessage } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/audit-history.tsx'
  ));
  ({ toSafeMediaUrl, mediaUrlError, mediaHostNotAllowedMessage } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/media-editor.tsx'
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
    if (path === `/v1/admin/projects/${project.id}/comments?status=pending`)
      return overrides.comments ?? comments.filter((comment) => comment.status === 'pending');
    if (path === `/v1/admin/projects/${project.id}/participants`)
      return overrides.participants ?? participants;
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
  assert.equal(
    marketplaceErrorMessage(new MarketplaceRequestError(403, 'PROJECT_SCOPE_DENIED')),
    "You don't have access to this project."
  );
  assert.equal(
    marketplaceErrorMessage(new MarketplaceRequestError(409, 'COMMENT_TRANSITION_INVALID')),
    'This comment has already changed. Refresh and try again.'
  );
});

void test('media URLs are constrained before reaching DOM URL sinks', () => {
  assert.equal(toSafeMediaUrl('javascript:alert(1)'), '');
  assert.equal(toSafeMediaUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(toSafeMediaUrl('not a URL'), '');
  assert.equal(
    toSafeMediaUrl('https://images.example/logo.png'),
    'https://images.example/logo.png'
  );
});

void test('rejected media hosts tell admins which hosts are valid', () => {
  for (const kind of ['logo', 'cover', 'gallery_image']) {
    assert.equal(
      mediaHostNotAllowedMessage(kind),
      'This image host is not allowed. Use an image from images.unsplash.com or from the Alternun image storage.'
    );
  }
  assert.match(
    mediaHostNotAllowedMessage('canva'),
    /Use a link from canva\.com, www\.canva\.com\./
  );
  assert.match(
    mediaUrlError('video', 'https://video.example.com/watch'),
    /Use a link from youtube\.com, .*player\.vimeo\.com\./
  );
  assert.equal(mediaUrlError('gallery_image', 'https://storage.example.com/a.png'), null);
  assert.equal(
    mediaUrlError('logo', 'http://images.unsplash.com/a.png'),
    'Enter a valid https link.'
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

void test('comment queue filters by status and enforces moderation permissions and reasons', () => {
  assert.deepEqual(
    commentsForStatus(comments, 'pending').map((comment) => comment.id),
    ['comment-1']
  );
  assert.deepEqual(
    commentsForStatus(comments, 'visible').map((comment) => comment.id),
    ['comment-2']
  );
  assert.deepEqual(commentActionAvailability(['partner_readonly'], 'pending'), {
    approve: false,
    reject: false,
    hide: false,
    restore: false,
  });
  assert.equal(commentActionAvailability(['sub_admin'], 'pending').approve, true);
  assert.equal(commentReasonError('reject', '   '), marketplaceCopy.comments.reasonRequired);
  assert.equal(commentReasonError('reject', 'Duplicate comment'), null);
});

void test('participant actions use friendly validation, role rules, and history routes', () => {
  assert.deepEqual(participantActionAvailability(['sub_admin']), { read: true, manage: true });
  assert.deepEqual(participantActionAvailability(['moderator']), { read: false, manage: false });
  assert.equal(
    participantRemovalReasonError('   '),
    marketplaceCopy.participants.reasonRequired
  );
  assert.equal(participantRemovalReasonError('Guest checked out'), null);
  assert.equal(
    participantHistoryPath(project.id, participants[0].id),
    `/v1/admin/projects/${project.id}/participants/${participants[0].id}/history`
  );
  assert.equal(
    marketplaceErrorMessage(new MarketplaceRequestError(409, 'PARTICIPANT_CONFLICT')),
    'This person already participates in the project.'
  );
  assert.equal(
    marketplaceErrorMessage(new MarketplaceRequestError(404, 'USER_NOT_FOUND')),
    'No verified account exists with that email.'
  );
});

void test('audit history permissions, filters, and messages stay safe and friendly', () => {
  assert.equal(hasMarketplacePermission(['platform_owner'], 'audit:read'), true);
  assert.equal(hasMarketplacePermission(['internal_admin'], 'audit:read'), true);
  assert.equal(hasMarketplacePermission(['partner_operator'], 'audit:read'), true);
  assert.equal(hasMarketplacePermission(['moderator'], 'audit:read'), true);
  assert.equal(hasMarketplacePermission(['sub_admin'], 'audit:read'), false);
  assert.equal(hasMarketplacePermission(['partner_readonly'], 'audit:read'), false);
  assert.equal(auditFilterResult('all'), undefined);
  assert.equal(auditFilterResult('changes'), 'allowed');
  assert.equal(auditFilterResult('denied'), 'denied');
  assert.equal(
    auditQueryPath(project.id, 'denied', 2),
    `/v1/admin/projects/${project.id}/audit?page=2&perPage=20&result=denied`
  );
  assert.equal(
    auditEventMessage({
      actor: 'Anna',
      action: 'completion.approved',
      result: 'allowed',
      reasonCode: null,
    }),
    'Anna approved a completion'
  );
  assert.equal(
    auditEventMessage({
      actor: 'hidden',
      action: 'authorization.denied',
      result: 'denied',
      reasonCode: 'PROTECTED_FIELD_WRITE_DENIED',
    }),
    'Access denied: tried to change a protected field'
  );
});

void test('project detail loads successful sections and a complete publishing checklist', async () => {
  const detail = await loadProjectDetail(simulatedGet(), project.id);
  assert.equal(detail.enterprise.kind, 'success');
  assert.equal(detail.media.kind, 'success');
  assert.equal(detail.activities.kind, 'success');
  assert.equal(detail.memberships.kind, 'success');
  assert.equal(detail.comments.kind, 'success');
  assert.equal(detail.participants.kind, 'success');
  assert.equal(detail.participants.data[0].email, 'guest@example.test');
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
  assert.deepEqual(detail.comments, { kind: 'success', data: comments.slice(0, 1) });
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
    if (
      path.endsWith('/media') ||
      path.includes('project-memberships') ||
      path.includes('/comments') ||
      path.includes('/participants')
    )
      throw forbidden;
    return get(path);
  }, project.id);
  assert.deepEqual(detail.media, { kind: 'forbidden' });
  assert.deepEqual(detail.memberships, { kind: 'forbidden' });
  assert.deepEqual(detail.comments, { kind: 'forbidden' });
  assert.deepEqual(detail.participants, { kind: 'forbidden' });
  assert.equal(detail.enterprise.kind, 'success');
  assert.equal(detail.activities.kind, 'success');
});
