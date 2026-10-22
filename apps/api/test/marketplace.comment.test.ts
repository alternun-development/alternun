/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceCommentRepository } from '../src/modules/marketplace/marketplace-comment.repository';
import { MarketplaceCommentService } from '../src/modules/marketplace/marketplace-comment.service';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import type {
  ProjectCommentRecord,
  ProjectRecord,
  PublicProjectComment,
} from '../src/modules/marketplace/marketplace.types';

const project: ProjectRecord = {
  id: '20000000-0000-4000-8000-000000000001',
  enterpriseId: '10000000-0000-4000-8000-000000000001',
  slug: 'published-project',
  status: 'published',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'en',
  content: {},
  firstPublishedAt: '2026-10-13T00:00:00.000Z',
  publishedAt: '2026-10-13T00:00:00.000Z',
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
};

const comment: ProjectCommentRecord = {
  id: '30000000-0000-4000-8000-000000000001',
  projectId: project.id,
  authorIssuer: 'verified-issuer',
  authorSubject: 'verified-subject',
  authorUserId: 'user-1',
  authorDisplayName: 'Verified Guest',
  body: 'A thoughtful visit.',
  status: 'pending',
  moderatedByIssuer: null,
  moderatedBySubject: null,
  moderatedAt: null,
  moderationReason: null,
  createdAt: '2026-10-15T12:00:00.000Z',
  updatedAt: '2026-10-15T12:00:00.000Z',
};

function principal(role: string): AdminPrincipal {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${role}-subject`,
    roles: [role],
    organizationIds: [],
  };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

function service(
  options: {
    published?: boolean;
    scope?: boolean;
    resolver?: (authorization: string) => Promise<string>;
    visible?: PublicProjectComment[];
  } = {}
) {
  const calls = {
    creates: [] as unknown[][],
    moderations: [] as unknown[][],
    scopes: 0,
    resolves: 0,
  };
  const commentRepository = {
    findVerifiedAuthor: async () => ({
      issuer: 'verified-issuer',
      subject: 'verified-subject',
      userId: 'user-1',
      displayName: 'Verified Guest',
    }),
    listVisible: async () =>
      options.visible ?? [
        {
          displayName: comment.authorDisplayName,
          body: comment.body,
          createdAt: comment.createdAt,
        },
      ],
    listAdmin: async () => [comment],
    findAdmin: async () => comment,
    create: async (...args: unknown[]) => {
      calls.creates.push(args);
      return comment;
    },
    moderate: async (...args: unknown[]) => {
      calls.moderations.push(args);
      return { ...comment, status: 'visible' as const };
    },
  };
  const adminRepository = {
    findProject: async () => project,
    actorHasScope: async () => {
      calls.scopes += 1;
      return options.scope ?? true;
    },
    audit: async () => undefined,
  };
  const publicRepository = {
    findPublishedBySlug: async () =>
      options.published === false ? null : { project, enterprise: {}, media: [] },
  };
  const resolver = async (authorization: string) => {
    calls.resolves += 1;
    return (options.resolver ?? (async () => 'user-1'))(authorization);
  };
  return {
    calls,
    service: new MarketplaceCommentService(
      commentRepository as never,
      adminRepository as never,
      publicRepository as never,
      resolver
    ),
  };
}

test('authenticated comment creation uses only the verified account identity', async () => {
  const fixture = service();
  const result = await fixture.service.create(
    project.slug,
    'Bearer verified-token',
    '  A thoughtful visit.  ',
    'request-1'
  );
  assert.deepEqual(result, {
    id: comment.id,
    status: 'pending',
    body: comment.body,
    createdAt: comment.createdAt,
  });
  assert.equal(fixture.calls.resolves, 1);
  assert.deepEqual(fixture.calls.creates[0]?.[1], {
    issuer: 'verified-issuer',
    subject: 'verified-subject',
    userId: 'user-1',
    displayName: 'Verified Guest',
  });
  assert.equal(fixture.calls.creates[0]?.[2], 'A thoughtful visit.');
});

test('comment creation requires a session and hides unpublished projects', async () => {
  const withoutSession = service();
  await assert.rejects(
    withoutSession.service.create(project.slug, undefined, comment.body, 'request-2'),
    expectApiError('USER_AUTH_REQUIRED', 401)
  );
  assert.equal(withoutSession.calls.resolves, 0);

  const unpublished = service({ published: false });
  await assert.rejects(
    unpublished.service.create(project.slug, 'Bearer token', comment.body, 'request-3'),
    expectApiError('PROJECT_NOT_FOUND', 404)
  );
});

test('public comment listing exposes no identity or moderation fields', async () => {
  const fixture = service();
  const result = await fixture.service.listVisible(project.slug, 1, 20);
  assert.equal(result.total, 1);
  assert.deepEqual(Object.keys(result.data[0] ?? {}).sort(), ['body', 'createdAt', 'displayName']);
  assert.equal('authorIssuer' in (result.data[0] ?? {}), false);
  assert.equal('moderationReason' in (result.data[0] ?? {}), false);
});

test('comment rate limit reason maps to HTTP 429', async () => {
  const repository = new MarketplaceCommentRepository({
    rpc: async () => ({
      data: { ok: false, reasonCode: 'COMMENT_RATE_LIMITED' },
      error: null,
    }),
  } as never);
  await assert.rejects(
    repository.create(
      project.id,
      {
        issuer: 'verified-issuer',
        subject: 'verified-subject',
        userId: 'user-1',
        displayName: 'Verified Guest',
      },
      comment.body,
      'request-4'
    ),
    expectApiError('COMMENT_RATE_LIMITED', 429)
  );
});

test('non-global moderation requires project membership scope', async () => {
  const denied = service({ scope: false });
  await assert.rejects(
    denied.service.moderate(principal('sub_admin'), 'request-5', project.id, comment.id, 'approve'),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(denied.calls.moderations.length, 0);

  const allowed = service({ scope: true });
  await allowed.service.moderate(
    principal('partner_operator'),
    'request-6',
    project.id,
    comment.id,
    'approve'
  );
  assert.equal(allowed.calls.scopes, 1);
  assert.equal(allowed.calls.moderations.length, 1);

  const global = service({ scope: false });
  await global.service.moderate(
    principal('moderator'),
    'request-7',
    project.id,
    comment.id,
    'approve'
  );
  assert.equal(global.calls.scopes, 0);
  assert.equal(global.calls.moderations.length, 1);
});

test('reject and hide require a non-empty reason before the RPC', async () => {
  const fixture = service();
  await assert.rejects(
    fixture.service.moderate(
      principal('platform_owner'),
      'request-8',
      project.id,
      comment.id,
      'reject',
      '   '
    ),
    expectApiError('COMMENT_REASON_REQUIRED', 422)
  );
  assert.equal(fixture.calls.moderations.length, 0);
});
