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
import type { MarketplaceActivityRepository } from '../src/modules/marketplace/marketplace-activity.repository';
import { MarketplaceActivityService } from '../src/modules/marketplace/marketplace-activity.service';
import {
  MarketplaceAdminRepository,
  resolveMarketplaceSupabaseConfig,
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
  ProjectActivityRecord,
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
const activity: ProjectActivityRecord = {
  id: 'a1',
  projectId: 'p1',
  code: 'nature-walk',
  status: 'published',
  defaultLocale: 'es',
  content: {
    es: { title: 'Caminata', description: 'Recorrido guiado' },
    en: { title: 'Walk', description: 'Guided tour' },
  },
  defaultAirsAmount: 5,
  maxAirsPerAward: 10,
  repeatPeriod: 'day',
  maxAwardsPerPeriod: 1,
  maxAwardsLifetime: 20,
  startsAt: null,
  endsAt: null,
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
    actorHasScope: async () => true,
    listActorMemberships: async () => [
      {
        enterpriseId: enterprise.id,
        projectId: null,
        scopeType: 'enterprise',
        role: 'partner_operator',
      },
    ],
    listEnterprises: async () => [enterprise],
    findEnterprise: async (id: string) => (id === enterprise.id ? enterprise : null),
    createEnterprise: async () => enterprise,
    updateEnterprise: async () => enterprise,
    setEnterpriseStatus: async () => enterprise,
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

test('pause, resume, and archive enterprise use the atomic status RPC', async () => {
  const targets: string[] = [];
  const { repository } = adminRepository({
    setEnterpriseStatus: async (_id: string, target: string) => {
      targets.push(target);
      return { ...enterprise, status: target };
    },
  });
  const service = new MarketplaceAdminService(repository);
  const owner = principal('platform_owner');
  await service.transitionEnterprise(owner, 'pause', 'e1', 'paused', 'maintenance');
  await service.transitionEnterprise(owner, 'resume', 'e1', 'active');
  await service.transitionEnterprise(owner, 'archive', 'e1', 'archived', 'closed');
  assert.deepEqual(targets, ['paused', 'active', 'archived']);
});

test('non-global role cannot change enterprise status', async () => {
  let statusCalls = 0;
  const { repository } = adminRepository({
    setEnterpriseStatus: async () => {
      statusCalls += 1;
      return enterprise;
    },
  });
  await assert.rejects(
    new MarketplaceAdminService(repository).transitionEnterprise(
      principal('partner_operator', ['e1']),
      'status-denied',
      'e1',
      'paused',
      'maintenance'
    ),
    expectApiError('PERMISSION_DENIED', 403)
  );
  assert.equal(statusCalls, 0);
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

test('project lookup ignores organizationIds and blocks access when membership scope is false', async () => {
  const { repository, audits } = adminRepository({
    findProject: async () => ({ ...project, enterpriseId: 'e2' }),
    actorHasScope: async () => false,
  });
  const service = new MarketplaceAdminService(repository);
  await assert.rejects(
    service.getProject(principal('partner_operator', ['e2']), 'r1', 'p1'),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
  assert.equal(audits[0].enterpriseId, 'e2');
});

test('global access skips scope RPC while scoped access requires a true result', async () => {
  let scopeCalls = 0;
  let receivedRoles: readonly string[] = [];
  let receivedRequiredRoles: readonly string[] = [];
  const global = adminRepository({
    actorHasScope: async () => {
      scopeCalls += 1;
      return false;
    },
  });
  await new MarketplaceAdminService(global.repository).getProject(
    principal('platform_owner'),
    'global',
    'p1'
  );
  assert.equal(scopeCalls, 0);

  const scoped = adminRepository({
    actorHasScope: async (
      _actor: unknown,
      roles: readonly string[],
      _enterpriseId: string,
      _projectId: string | null,
      requiredRoles: readonly string[]
    ) => {
      scopeCalls += 1;
      receivedRoles = roles;
      receivedRequiredRoles = requiredRoles;
      return true;
    },
  });
  const scopedPrincipal = {
    ...principal('sub_admin', []),
    roles: ['sub_admin', 'unknown_role'],
  };
  await new MarketplaceAdminService(scoped.repository).getProject(scopedPrincipal, 'scoped', 'p1');
  assert.equal(scopeCalls, 1);
  assert.deepEqual(receivedRoles, ['sub_admin', 'unknown_role']);
  assert.deepEqual(receivedRequiredRoles, ['sub_admin']);
});

test('scope RPC false or exception fails closed with 403', async () => {
  for (const actorHasScope of [
    async () => false,
    async () => {
      throw new Error('rpc unavailable');
    },
  ]) {
    const { repository } = adminRepository({ actorHasScope });
    await assert.rejects(
      new MarketplaceAdminService(repository).getProject(
        principal('sub_admin', ['e1']),
        'scope-denied',
        'p1'
      ),
      expectApiError('PROJECT_SCOPE_DENIED', 403)
    );
  }
});

test('repository scope RPC errors return false', async () => {
  const repository = new MarketplaceAdminRepository({
    rpc: async () => {
      throw new Error('rpc unavailable');
    },
  } as never);
  assert.equal(
    await repository.actorHasScope(
      { issuer: 'issuer', subject: 'subject', roles: ['sub_admin'] },
      ['sub_admin'],
      'e1',
      'p1',
      ['sub_admin']
    ),
    false
  );
});

test('create, update, and reorder use one atomic RPC each', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const projectRow = {
    id: 'p1',
    slug: 'hotel-project',
    status: 'draft',
    category_code: 'hospitality_ecotourism',
    country_code: 'CO',
    time_zone: 'America/Bogota',
    default_locale: 'es',
    content,
    first_published_at: null,
    published_at: null,
    created_at: 'now',
    updated_at: 'now',
  };
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === 'marketplace_reorder_project_media') {
        return {
          data: {
            ok: true,
            media: [
              {
                id: 'm1',
                project_id: 'p1',
                kind: 'gallery_image',
                url: 'https://images.example/one.jpg',
                embed_url: null,
                alt_text: { es: 'Uno' },
                caption: {},
                sort_order: 0,
                is_active: true,
                created_at: 'now',
                updated_at: 'now',
              },
            ],
          },
          error: null,
        };
      }
      return { data: { ok: true, project: projectRow }, error: null };
    },
  };
  const repository = new MarketplaceAdminRepository(client as never);
  const actor = { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] };
  const input = {
    enterpriseId: 'e1',
    slug: 'hotel-project',
    categoryCode: 'hospitality_ecotourism',
    countryCode: 'CO',
    timeZone: 'America/Bogota',
    defaultLocale: 'es',
    content,
  };

  await repository.createProject(input, actor, 'create-request');
  await repository.updateProject('p1', { content }, actor, 'update-request', 'e1');
  await repository.reorderMedia('p1', [{ id: 'm1', sortOrder: 0 }], actor, 'reorder-request');

  assert.deepEqual(
    calls.map(({ name }) => name),
    [
      'marketplace_create_project',
      'marketplace_update_project',
      'marketplace_reorder_project_media',
    ]
  );
  assert.equal(calls[0].args.p_request_id, 'create-request');
  assert.equal(calls[1].args.p_request_id, 'update-request');
  assert.equal(calls[2].args.p_request_id, 'reorder-request');
});

test('atomic mutation reasonCode maps to the marketplace API error', async () => {
  const repository = new MarketplaceAdminRepository({
    rpc: async () => ({
      data: { ok: false, reasonCode: 'ENTERPRISE_NOT_ACTIVE' },
      error: null,
    }),
  } as never);
  await assert.rejects(
    repository.createProject(
      {
        enterpriseId: 'e1',
        slug: 'hotel-project',
        categoryCode: 'hospitality_ecotourism',
        countryCode: 'CO',
        timeZone: 'America/Bogota',
        defaultLocale: 'es',
        content,
      },
      { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] },
      'request'
    ),
    expectApiError('ENTERPRISE_NOT_ACTIVE', 409)
  );
});

test('enterprise status changes call the atomic RPC with confirmed status values', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new MarketplaceAdminRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return {
        data: {
          ok: true,
          enterprise: {
            id: 'e1',
            slug: 'hotel',
            display_name: 'Hotel',
            legal_name: null,
            status: args.p_target_status,
            country_code: 'CO',
            website_url: null,
            created_at: 'now',
            updated_at: 'now',
          },
        },
        error: null,
      };
    },
  } as never);
  const actor = { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] };
  await repository.setEnterpriseStatus('e1', 'paused', actor, 'pause', 'maintenance');
  await repository.setEnterpriseStatus('e1', 'active', actor, 'resume');
  await repository.setEnterpriseStatus('e1', 'archived', actor, 'archive', 'closed');
  assert.deepEqual(
    calls.map(({ name }) => name),
    [
      'marketplace_set_enterprise_status',
      'marketplace_set_enterprise_status',
      'marketplace_set_enterprise_status',
    ]
  );
  assert.deepEqual(
    calls.map(({ args }) => args.p_target_status),
    ['paused', 'active', 'archived']
  );
});

test('non-global project creation without membership scope is denied', async () => {
  let creates = 0;
  const { repository } = adminRepository({
    actorHasScope: async () => false,
    createProject: async () => {
      creates += 1;
      return project;
    },
  });
  await assert.rejects(
    new MarketplaceAdminService(repository).createProject(
      principal('partner_operator', ['e1']),
      'create-denied',
      {
        enterpriseId: 'e1',
        slug: 'hotel-project',
        categoryCode: 'hospitality_ecotourism',
        countryCode: 'CO',
        timeZone: 'America/Bogota',
        defaultLocale: 'es',
        content,
      }
    ),
    expectApiError('ENTERPRISE_SCOPE_DENIED', 403)
  );
  assert.equal(creates, 0);
});

test('project-scoped sub-admin lists only its member project', async () => {
  const otherProject = { ...project, id: 'p2', slug: 'other-project' };
  const { repository } = adminRepository({
    listActorMemberships: async () => [
      { enterpriseId: 'e1', projectId: 'p1', scopeType: 'project', role: 'sub_admin' },
    ],
    listProjects: async (scope: { enterpriseIds: string[]; projectIds: string[] }) =>
      [project, otherProject].filter(
        (item) =>
          scope.enterpriseIds.includes(item.enterpriseId) || scope.projectIds.includes(item.id)
      ),
  });
  const result = await new MarketplaceAdminService(repository).listProjects(
    principal('sub_admin', ['*']),
    'list-projects'
  );
  assert.deepEqual(
    result.map(({ id }) => id),
    ['p1']
  );
});

test('non-global enterprise list comes only from active memberships', async () => {
  let listedIds: readonly string[] | undefined;
  const secondEnterprise = { ...enterprise, id: 'e2', slug: 'second' };
  const { repository } = adminRepository({
    listActorMemberships: async () => [
      { enterpriseId: 'e2', projectId: 'p2', scopeType: 'project', role: 'sub_admin' },
    ],
    listEnterprises: async (enterpriseIds?: readonly string[]) => {
      listedIds = enterpriseIds;
      return [enterprise, secondEnterprise].filter((item) => enterpriseIds?.includes(item.id));
    },
  });
  const result = await new MarketplaceAdminService(repository).listEnterprises(
    principal('sub_admin', ['e1', '*']),
    'list-enterprises'
  );
  assert.deepEqual(listedIds, ['e2']);
  assert.deepEqual(
    result.map(({ id }) => id),
    ['e2']
  );
});

test('missing project route returns PROJECT_NOT_FOUND before scope lookup', async () => {
  let scopeCalls = 0;
  const { repository } = adminRepository({
    findProject: async () => null,
    actorHasScope: async () => {
      scopeCalls += 1;
      return true;
    },
  });
  await assert.rejects(
    new MarketplaceAdminService(repository).getProject(
      principal('sub_admin'),
      'missing-project',
      'missing'
    ),
    expectApiError('PROJECT_NOT_FOUND', 404)
  );
  assert.equal(scopeCalls, 0);
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

test('public activities expose localized copy without AIRS policy fields', async () => {
  const publicRepository = {
    findPublishedBySlug: async () => ({
      project: { ...project, status: 'published' },
      enterprise,
      media: [],
    }),
  } as unknown as MarketplacePublicRepository;
  const activityRepository = {
    list: async () => [activity],
  } as unknown as MarketplaceActivityRepository;
  const { repository } = adminRepository();
  const service = new MarketplaceActivityService(activityRepository, repository, publicRepository);
  const [result] = await service.listPublished(project.slug, 'en');
  assert.equal(result.title, 'Walk');
  assert.equal('defaultAirsAmount' in result, false);
  assert.equal('maxAwardsLifetime' in result, false);
  assert.equal('createdByIssuer' in result, false);
});

test('non-global activity read without a project membership is denied', async () => {
  const activityRepository = {
    list: async () => [activity],
  } as unknown as MarketplaceActivityRepository;
  const { repository } = adminRepository({ actorHasScope: async () => false });
  const service = new MarketplaceActivityService(
    activityRepository,
    repository,
    {} as MarketplacePublicRepository
  );
  await assert.rejects(
    service.list(principal('partner_readonly', ['e1']), 'no-membership', 'p1'),
    expectApiError('PROJECT_SCOPE_DENIED', 403)
  );
});
