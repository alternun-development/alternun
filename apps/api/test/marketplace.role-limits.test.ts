/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { grantsGlobally, type AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceActivityService } from '../src/modules/marketplace/marketplace-activity.service';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import { MarketplaceAdminGuard } from '../src/modules/marketplace/marketplace.guard';
import { MarketplaceAdminService } from '../src/modules/marketplace/marketplace.service';
import type {
  AuditInput,
  ProjectMediaRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const ROLES = [
  'platform_owner',
  'internal_admin',
  'moderator',
  'partner_operator',
  'sub_admin',
  'partner_readonly',
] as const;

const project = {
  id: 'p1',
  enterpriseId: 'e1',
  slug: 'hotel-project',
  status: 'published',
  defaultLocale: 'es',
} as ProjectRecord;

const activity = {
  id: 'a1',
  projectId: 'p1',
  code: 'cleanup',
  status: 'published',
  defaultLocale: 'es',
  content: { es: { title: 'Limpieza', description: 'Limpieza de playa' } },
  defaultAirsAmount: 10,
  maxAirsPerAward: 10,
  repeatPeriod: 'none',
  maxAwardsPerPeriod: 1,
  maxAwardsLifetime: 1,
  startsAt: null,
  endsAt: null,
};

const completion = { id: 'c1', projectId: 'p1', activityId: 'a1', status: 'pending' };

function principal(...roles: string[]): AdminPrincipal {
  return {
    iss: 'issuer',
    aud: 'admin',
    sub: `${roles.join('+')}-subject`,
    roles,
    organizationIds: [],
  };
}

function expectApiError(code: string) {
  return (error: unknown) => error instanceof MarketplaceApiError && error.code === code;
}

function activityService(hasScope = true) {
  const audits: AuditInput[] = [];
  const writes: string[] = [];
  const scopeCalls: string[][] = [];
  const service = new MarketplaceActivityService(
    {
      find: async () => activity,
      findCompletion: async () => completion,
      awardCompletion: async () => {
        writes.push('award');
        return { completionId: 'c1', ledgerEntryId: 'l1' };
      },
      rejectCompletion: async () => {
        writes.push('reject');
        return { ...completion, status: 'rejected' };
      },
      createCompletion: async () => {
        writes.push('create');
        return completion;
      },
    } as never,
    {
      findProject: async () => project,
      audit: async (input: AuditInput) => {
        audits.push(input);
      },
      actorHasScope: async (
        _actor: unknown,
        _roles: unknown,
        _e: unknown,
        _p: unknown,
        required: string[]
      ) => {
        scopeCalls.push(required);
        return hasScope;
      },
    } as never,
    {} as never,
    { isActive: async () => true } as never
  );
  return { service, audits, writes, scopeCalls };
}

const completionActions = {
  award: (service: MarketplaceActivityService, actor: AdminPrincipal) =>
    service.awardCompletion(actor, 'request', 'p1', 'c1', {}),
  reject: (service: MarketplaceActivityService, actor: AdminPrincipal) =>
    service.rejectCompletion(actor, 'request', 'p1', 'c1', { notes: 'no evidence' }),
  create: (service: MarketplaceActivityService, actor: AdminPrincipal) =>
    service.createCompletion(actor, 'request', 'p1', 'a1', { userId: 'user-1' }),
};

const allowedCompletionRoles: Record<keyof typeof completionActions, readonly string[]> = {
  award: ['platform_owner', 'internal_admin', 'partner_operator'],
  reject: ['platform_owner', 'internal_admin', 'partner_operator', 'sub_admin'],
  create: ['platform_owner', 'internal_admin', 'partner_operator', 'sub_admin'],
};

for (const [action, run] of Object.entries(completionActions) as Array<
  [keyof typeof completionActions, (typeof completionActions)['award']]
>) {
  for (const role of ROLES) {
    const allowed = allowedCompletionRoles[action].includes(role);
    test(`completion ${action}: ${role} is ${
      allowed ? 'allowed' : 'denied and audited'
    }`, async () => {
      const { service, audits, writes } = activityService();
      if (allowed) {
        await run(service, principal(role));
        assert.deepEqual(writes, [action]);
      } else {
        await assert.rejects(run(service, principal(role)), expectApiError('PERMISSION_DENIED'));
        assert.deepEqual(writes, []);
        assert.equal(audits.at(-1)?.result, 'denied');
        assert.equal(audits.at(-1)?.reasonCode, 'PERMISSION_DENIED');
      }
    });
  }
}

test('moderator next to partner_operator still needs the partner_operator membership to award', async () => {
  const denied = activityService(false);
  await assert.rejects(
    completionActions.award(denied.service, principal('moderator', 'partner_operator')),
    expectApiError('PROJECT_SCOPE_DENIED')
  );
  assert.deepEqual(denied.writes, []);
  assert.deepEqual(denied.scopeCalls, [['partner_operator']]);
  assert.equal(denied.audits.at(-1)?.reasonCode, 'PROJECT_SCOPE_DENIED');

  const scoped = activityService(true);
  await completionActions.award(scoped.service, principal('moderator', 'partner_operator'));
  assert.deepEqual(scoped.writes, ['award']);
});

test('grantsGlobally only counts global roles that hold the permission themselves', () => {
  assert.equal(grantsGlobally(principal('platform_owner'), 'completions:award'), true);
  assert.equal(grantsGlobally(principal('moderator'), 'comments:moderate'), true);
  assert.equal(grantsGlobally(principal('moderator'), 'completions:award'), false);
  assert.equal(
    grantsGlobally(principal('moderator', 'partner_operator'), 'completions:award'),
    false
  );
  assert.equal(grantsGlobally(principal('partner_operator'), 'completions:award'), false);
});

function guardContext(roles: string[]) {
  const request = {
    adminPrincipal: principal(...roles),
    params: { projectId: 'p1', id: 'c1' },
    headers: {},
    id: 'request',
  };
  const handler = () => undefined;
  Reflect.defineMetadata(
    'marketplace:authorization',
    { permission: 'completions:award', scope: 'project' },
    handler
  );
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
  };
}

test('guard checks project scope when moderator is combined with a scoped role', async () => {
  const audits: AuditInput[] = [];
  let scopeChecks = 0;
  const guard = new MarketplaceAdminGuard(
    { canActivate: async () => true } as never,
    {
      findProject: async () => project,
      actorHasScope: async () => {
        scopeChecks += 1;
        return false;
      },
      audit: async (input: AuditInput) => {
        audits.push(input);
      },
    } as never
  );
  await assert.rejects(
    guard.canActivate(guardContext(['moderator', 'partner_operator']) as never),
    expectApiError('PROJECT_SCOPE_DENIED')
  );
  assert.equal(scopeChecks, 1);
  assert.equal(audits.at(-1)?.reasonCode, 'PROJECT_SCOPE_DENIED');

  await assert.rejects(
    guard.canActivate(guardContext(['moderator']) as never),
    expectApiError('PERMISSION_DENIED')
  );
  assert.equal(await guard.canActivate(guardContext(['platform_owner']) as never), true);
});

function mediaRecord(
  kind: string,
  overrides: Partial<ProjectMediaRecord> = {}
): ProjectMediaRecord {
  return {
    id: `${kind}-1`,
    projectId: 'p1',
    kind,
    url: `https://images.example.test/${kind}.png`,
    embedUrl: null,
    altText: { es: 'Imagen' },
    caption: {},
    sortOrder: 0,
    isActive: true,
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  } as ProjectMediaRecord;
}

function mediaService(existing: ProjectMediaRecord, brandScope = true) {
  const audits: AuditInput[] = [];
  const writes: string[] = [];
  const service = new MarketplaceAdminService({
    findProject: async () => project,
    audit: async (input: AuditInput) => {
      audits.push(input);
    },
    actorHasScope: async (
      _actor: unknown,
      _roles: unknown,
      _e: unknown,
      _p: unknown,
      required: string[]
    ) => (required.length === 1 && required[0] === 'partner_operator' ? brandScope : true),
    allowedHosts: async () => ['images.example.test'],
    findMedia: async () => existing,
    createMedia: async () => {
      writes.push('create');
      return existing;
    },
    updateMedia: async () => {
      writes.push('update');
      return existing;
    },
    reorderMedia: async () => {
      writes.push('reorder');
      return [existing];
    },
  } as never);
  return { service, audits, writes };
}

const brandWriters = ['platform_owner', 'internal_admin', 'partner_operator'];
const mediaWriters = [...brandWriters, 'sub_admin'];

for (const kind of ['logo', 'cover', 'gallery_image']) {
  const isBrand = kind !== 'gallery_image';
  for (const role of ROLES) {
    const allowed = isBrand ? brandWriters.includes(role) : mediaWriters.includes(role);
    const deniedCode = mediaWriters.includes(role)
      ? 'BRAND_ASSET_WRITE_DENIED'
      : 'PERMISSION_DENIED';
    test(`media create ${kind}: ${role} is ${
      allowed ? 'allowed' : `denied with ${deniedCode}`
    }`, async () => {
      const { service, audits, writes } = mediaService(mediaRecord(kind));
      const input = {
        kind,
        url: `https://images.example.test/${kind}.png`,
        altText: { es: 'Imagen' },
      } as never;
      if (allowed) {
        await service.createMedia(principal(role), 'request', 'p1', input);
        assert.deepEqual(writes, ['create']);
      } else {
        await assert.rejects(
          service.createMedia(principal(role), 'request', 'p1', input),
          expectApiError(deniedCode)
        );
        assert.deepEqual(writes, []);
        assert.equal(audits.at(-1)?.result, 'denied');
        assert.equal(audits.at(-1)?.reasonCode, deniedCode);
      }
    });
  }
}

test('sub_admin cannot edit, retire, or turn gallery media into a logo or cover', async () => {
  for (const kind of ['logo', 'cover']) {
    const editing = mediaService(mediaRecord(kind));
    await assert.rejects(
      editing.service.updateMedia(principal('sub_admin'), 'request', 'p1', `${kind}-1`, {
        altText: { es: 'Nueva' },
      }),
      expectApiError('BRAND_ASSET_WRITE_DENIED')
    );
    await assert.rejects(
      editing.service.retireMedia(principal('sub_admin'), 'request', 'p1', `${kind}-1`),
      expectApiError('BRAND_ASSET_WRITE_DENIED')
    );
    assert.deepEqual(editing.writes, []);
    assert.equal(editing.audits.at(-1)?.reasonCode, 'BRAND_ASSET_WRITE_DENIED');

    const converting = mediaService(mediaRecord('gallery_image'));
    await assert.rejects(
      converting.service.updateMedia(principal('sub_admin'), 'request', 'p1', 'gallery_image-1', {
        kind,
      } as never),
      expectApiError('BRAND_ASSET_WRITE_DENIED')
    );
    assert.deepEqual(converting.writes, []);
  }
});

test('sub_admin keeps editing, retiring, and reordering gallery media', async () => {
  const { service, writes } = mediaService(mediaRecord('gallery_image'));
  await service.updateMedia(principal('sub_admin'), 'request', 'p1', 'gallery_image-1', {
    altText: { es: 'Nueva' },
  });
  await service.retireMedia(principal('sub_admin'), 'request', 'p1', 'gallery_image-1');
  await service.reorderMedia(principal('sub_admin'), 'request', 'p1', {
    items: [{ id: 'gallery_image-1', sortOrder: 0 }],
  } as never);
  assert.deepEqual(writes, ['update', 'update', 'reorder']);
});

test('moderator may retire gallery media but not the logo or cover', async () => {
  const gallery = mediaService(mediaRecord('gallery_image'));
  await gallery.service.retireMedia(principal('moderator'), 'request', 'p1', 'gallery_image-1');
  assert.deepEqual(gallery.writes, ['update']);

  for (const kind of ['logo', 'cover']) {
    const brand = mediaService(mediaRecord(kind));
    await assert.rejects(
      brand.service.retireMedia(principal('moderator'), 'request', 'p1', `${kind}-1`),
      expectApiError('BRAND_ASSET_WRITE_DENIED')
    );
    assert.deepEqual(brand.writes, []);
  }
});

test('partner_operator needs its own membership on the project to change brand assets', async () => {
  const { service, writes, audits } = mediaService(mediaRecord('logo'), false);
  await assert.rejects(
    service.updateMedia(principal('sub_admin', 'partner_operator'), 'request', 'p1', 'logo-1', {
      altText: { es: 'Nueva' },
    }),
    expectApiError('BRAND_ASSET_WRITE_DENIED')
  );
  assert.deepEqual(writes, []);
  assert.equal(audits.at(-1)?.reasonCode, 'BRAND_ASSET_WRITE_DENIED');
});
