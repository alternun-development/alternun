/* eslint-disable */
import assert = require('node:assert/strict');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { CreateProjectMediaDto } from '../src/modules/marketplace/marketplace.dto';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import {
  resolveMarketplaceSupabaseConfig,
  type MarketplaceAdminRepository,
  type MarketplacePublicRepository,
} from '../src/modules/marketplace/marketplace.repository';
import {
  MarketplaceAdminService,
  MarketplacePublicService,
} from '../src/modules/marketplace/marketplace.service';
import type {
  AuditInput,
  EnterpriseRecord,
  ProjectMediaRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const content = {
  es: {
    title: 'Hotel',
    location: 'Colombia',
    theme: 'Regeneración',
    description: 'Descripción',
    waysToContribute: ['Visitar'],
  },
  en: {
    title: 'Hotel',
    location: 'Colombia',
    theme: 'Regeneration',
    description: 'Description',
    waysToContribute: ['Visit'],
  },
};
const enterprise: EnterpriseRecord = {
  id: 'e1',
  slug: 'hotel',
  displayName: 'Hotel',
  legalName: null,
  status: 'active',
  countryCode: 'CO',
  websiteUrl: null,
  createdAt: 'now',
  updatedAt: 'now',
};
const project: ProjectRecord = {
  id: 'p1',
  enterpriseId: 'e1',
  slug: 'hotel-project',
  status: 'draft',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'es',
  content,
  firstPublishedAt: null,
  publishedAt: null,
  createdAt: 'now',
  updatedAt: 'now',
};
const media: ProjectMediaRecord = {
  id: 'm1',
  projectId: 'p1',
  kind: 'video',
  url: 'https://youtube.com/watch?v=1',
  embedUrl: null,
  altText: {},
  caption: {},
  sortOrder: 0,
  isActive: true,
  createdAt: 'now',
  updatedAt: 'now',
};

function principal(role: string, organizationIds = ['e1']): AdminPrincipal {
  return { iss: 'issuer', aud: 'admin', sub: `${role}-subject`, roles: [role], organizationIds };
}

function expectApiError(code: string, status: number) {
  return (error: unknown) =>
    error instanceof MarketplaceApiError && error.code === code && error.getStatus() === status;
}

function adminRepository(overrides: Record<string, unknown> = {}) {
  const audits: AuditInput[] = [];
  const repository = {
    audit: async (input: AuditInput) => {
      audits.push(input);
    },
    listEnterprises: async () => [enterprise],
    findEnterprise: async (id: string) => (id === enterprise.id ? enterprise : null),
    createEnterprise: async () => enterprise,
    updateEnterprise: async () => enterprise,
    listProjects: async () => [project],
    findProject: async (id: string) => (id === project.id ? project : null),
    createProject: async () => project,
    updateProject: async (_id: string, input: Partial<ProjectRecord>) => ({ ...project, ...input }),
    categoryExists: async () => true,
    transitionProject: async () => ({ ok: true }),
    listMedia: async () => [media],
    allowedHosts: async () => ['youtube.com'],
    findMedia: async () => media,
    createMedia: async () => media,
    updateMedia: async () => media,
    reorderMedia: async () => [media],
    ...overrides,
  };
  return { repository: repository as unknown as MarketplaceAdminRepository, audits };
}

test('public service never returns draft or paused rows and resolves query locale first', async () => {
  const repository = {
    listPublished: async () => [
      { project: { ...project, status: 'draft' }, enterprise, media: [] },
      { project: { ...project, id: 'p2', status: 'paused' }, enterprise, media: [] },
      { project: { ...project, id: 'p3', status: 'published' }, enterprise, media: [media] },
    ],
    findPublishedBySlug: async () => ({
      project: { ...project, status: 'paused' },
      enterprise,
      media: [],
    }),
  } as unknown as MarketplacePublicRepository;
  const service = new MarketplacePublicService(repository);
  const result = await service.list('en', 'es');
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].locale, 'en');
  assert.equal(result.data[0].description, 'Description');
  assert.equal(result.total, 1);
  await assert.rejects(service.findBySlug(project.slug), expectApiError('PROJECT_NOT_FOUND', 404));
});

test('public repository has a fixed published filter and is separate from admin repository', () => {
  const source = readFileSync(
    join(__dirname, '../src/modules/marketplace/marketplace.repository.ts'),
    'utf8'
  );
  assert.match(source, /class MarketplacePublicRepository[\s\S]*?\.eq\('status', 'published'\)/);
  assert.match(source, /class MarketplaceAdminRepository/);
});

test('partner operator cannot publish, while platform owner delegates the transition to the SQL RPC', async () => {
  let transitionCalls = 0;
  const { repository, audits } = adminRepository({
    transitionProject: async () => {
      transitionCalls += 1;
      return { ok: true };
    },
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.transition(principal('partner_operator'), 'r1', 'p1', 'published'),
    expectApiError('PERMISSION_DENIED', 403)
  );
  await service.transition(principal('platform_owner', ['*']), 'r2', 'p1', 'published');
  assert.equal(transitionCalls, 1);
  assert.equal(audits[0].reasonCode, 'PERMISSION_DENIED');
});

test('scoped content roles can edit copy but cannot write protected project fields', async () => {
  const { repository, audits } = adminRepository();
  const service = new MarketplaceAdminService(repository);
  const updated = await service.updateProject(principal('sub_admin'), 'r1', 'p1', { content });
  assert.equal(updated.id, 'p1');
  await assert.rejects(
    service.updateProject(principal('moderator'), 'r2', 'p1', { categoryCode: 'community' }),
    expectApiError('PROTECTED_FIELD_WRITE_DENIED', 403)
  );
  await assert.rejects(
    service.updateProject(principal('partner_readonly'), 'r3', 'p1', { content }),
    expectApiError('PERMISSION_DENIED', 403)
  );
  assert.equal(audits.filter((entry) => entry.result === 'denied').length, 2);
});

test('partner operator edits enterprise presentation but not protected legal identity', async () => {
  const { repository } = adminRepository();
  const service = new MarketplaceAdminService(repository);
  await service.updateEnterprise(principal('partner_operator'), 'r1', 'e1', {
    displayName: 'New display name',
  });
  await assert.rejects(
    service.updateEnterprise(principal('partner_operator'), 'r2', 'e1', {
      legalName: 'Protected legal name',
    }),
    expectApiError('PROTECTED_FIELD_WRITE_DENIED', 403)
  );
});

test('invalid SQL transition reason maps to the contract 409', async () => {
  const { repository } = adminRepository({
    transitionProject: async () => ({ ok: false, reasonCode: 'PROJECT_STATUS_TRANSITION_INVALID' }),
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.transition(principal('internal_admin', ['*']), 'r1', 'p1', 'archived'),
    expectApiError('PROJECT_STATUS_TRANSITION_INVALID', 409)
  );
});

test('slug is immutable after first publication and denial is audited', async () => {
  const { repository, audits } = adminRepository({
    findProject: async () => ({ ...project, firstPublishedAt: '2026-10-13T00:00:00Z' }),
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.updateProject(principal('partner_operator'), 'r1', 'p1', { slug: 'new-slug' }),
    expectApiError('PROJECT_SLUG_IMMUTABLE', 409)
  );
  assert.equal(audits.at(-1)?.reasonCode, 'PROJECT_SLUG_IMMUTABLE');
});

test('media rejects non-allowlisted hosts and literal IPs before repository mutation', async () => {
  let creates = 0;
  const { repository } = adminRepository({
    createMedia: async () => {
      creates += 1;
      return media;
    },
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.createMedia(principal('partner_operator'), 'r1', 'p1', {
      kind: 'video',
      url: 'https://evil.example/video',
    }),
    expectApiError('MEDIA_HOST_NOT_ALLOWED', 422)
  );
  await assert.rejects(
    service.createMedia(principal('partner_operator'), 'r2', 'p1', {
      kind: 'video',
      url: 'https://127.0.0.1/video',
    }),
    expectApiError('MEDIA_URL_INVALID', 422)
  );
  assert.equal(creates, 0);
});

test('malformed and null media input produces validation errors instead of reaching service code', async () => {
  const dto = plainToInstance(CreateProjectMediaDto, { kind: 'video', url: null, sortOrder: -1 });
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === 'url'));
  assert.ok(errors.some((error) => error.property === 'sortOrder'));

  const { repository } = adminRepository();
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.createMedia(principal('partner_operator'), 'r-null', 'p1', null as never),
    expectApiError('VALIDATION_FAILED', 400)
  );
});

test('project lookup resolves enterprise scope from repository and blocks cross-enterprise access', async () => {
  const { repository, audits } = adminRepository({
    findProject: async () => ({ ...project, enterpriseId: 'e2' }),
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.getProject(principal('partner_operator', ['e1']), 'r1', 'p1'),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(audits[0].enterpriseId, 'e2');
});

test('service-role configuration never falls back to anon or Expo public keys', () => {
  assert.equal(
    resolveMarketplaceSupabaseConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      EXPO_PUBLIC_SUPABASE_KEY: 'public',
    }),
    null
  );
  assert.deepEqual(
    resolveMarketplaceSupabaseConfig({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service',
    }),
    { url: 'https://example.supabase.co', serviceRoleKey: 'service' }
  );
});
