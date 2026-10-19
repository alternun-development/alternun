/* eslint-disable */
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import type { MarketplacePublicRepository } from '../src/modules/marketplace/marketplace.repository';
import { MarketplacePublicService } from '../src/modules/marketplace/marketplace.service';
import type {
  EnterpriseRecord,
  ProjectMediaRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const enterprise: EnterpriseRecord = {
  id: 'enterprise-1',
  slug: 'forest-hotel',
  displayName: 'Forest Hotel',
  legalName: 'Private legal name',
  status: 'active',
  countryCode: 'CO',
  websiteUrl: 'https://forest.example',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};
const project: ProjectRecord = {
  id: 'project-1',
  enterpriseId: enterprise.id,
  slug: 'forest-stay',
  status: 'published',
  categoryCode: 'hospitality_ecotourism',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'es',
  content: {
    es: {
      title: 'Estadía en el bosque',
      location: 'Colombia',
      theme: 'Conservación',
      description: 'Una experiencia regenerativa.',
      waysToContribute: ['Visitar'],
    },
    en: {
      title: 'Forest stay',
      location: 'Colombia',
      theme: 'Conservation',
      description: 'A regenerative experience.',
      waysToContribute: ['Visit'],
    },
  },
  firstPublishedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2025-12-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  createdBy: { issuer: 'private-issuer', subject: 'private-subject' },
};
const logo: ProjectMediaRecord = {
  id: 'logo-1',
  projectId: project.id,
  kind: 'logo',
  url: 'https://cdn.example/forest-logo.png',
  embedUrl: null,
  altText: { es: 'Logo del hotel', en: 'Hotel logo' },
  caption: {},
  sortOrder: 0,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repository(rows: unknown[]): MarketplacePublicRepository {
  return { listPublished: async () => rows } as unknown as MarketplacePublicRepository;
}

function expectNotFound(error: unknown): boolean {
  return (
    error instanceof MarketplaceApiError &&
    error.code === 'ENTERPRISE_NOT_FOUND' &&
    error.getStatus() === 404
  );
}

test('public enterprise list includes only active enterprises with published projects', async () => {
  const service = new MarketplacePublicService(
    repository([
      { project, enterprise, media: [logo] },
      { project: { ...project, id: 'project-2', slug: 'forest-walk' }, enterprise, media: [] },
      {
        project: { ...project, id: 'project-3' },
        enterprise: { ...enterprise, id: 'paused-1', slug: 'paused', status: 'paused' },
        media: [],
      },
      {
        project: { ...project, id: 'draft-1', status: 'draft' },
        enterprise: { ...enterprise, id: 'draft-enterprise', slug: 'draft-enterprise' },
        media: [],
      },
    ])
  );

  const result = await service.listEnterprises('en', undefined, 1, 20);
  assert.equal(result.total, 1);
  assert.deepEqual(result.data[0], {
    id: enterprise.id,
    slug: enterprise.slug,
    displayName: enterprise.displayName,
    logo: { url: logo.url, altText: 'Hotel logo' },
    countryCode: 'CO',
    websiteUrl: 'https://forest.example',
    projectCount: 2,
  });
});

test('public enterprise detail returns localized published projects without internal fields', async () => {
  const service = new MarketplacePublicService(
    repository([
      {
        project,
        enterprise: { ...enterprise, websiteUrl: 'http://unsafe.example' },
        media: [logo],
      },
    ])
  );
  const result = await service.findEnterpriseBySlug(enterprise.slug, 'en');
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].title, 'Forest stay');
  assert.equal(result.websiteUrl, null);
  assert.deepEqual(Object.keys(result).sort(), [
    'countryCode',
    'displayName',
    'id',
    'logo',
    'projectCount',
    'projects',
    'slug',
    'websiteUrl',
  ]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /http:\/\/unsafe/);
  assert.doesNotMatch(
    serialized,
    /Private legal name|private-issuer|private-subject|legalName|createdBy/
  );
});

test('paused, archived, and enterprises without published projects are unavailable', async () => {
  for (const status of ['paused', 'archived'] as const) {
    const service = new MarketplacePublicService(
      repository([{ project, enterprise: { ...enterprise, status }, media: [] }])
    );
    await assert.rejects(service.findEnterpriseBySlug(enterprise.slug), expectNotFound);
  }
  const emptyService = new MarketplacePublicService(repository([]));
  await assert.rejects(emptyService.findEnterpriseBySlug(enterprise.slug), expectNotFound);
});
