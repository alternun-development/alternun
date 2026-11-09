/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import { MarketplaceAdminService } from '../src/modules/marketplace/marketplace.service';
import type {
  AuditInput,
  EnterpriseRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const STORAGE_HOST = 'devref.supabase.co';

const project = {
  id: 'p1',
  enterpriseId: 'alternun',
  slug: 'fundacion-batis',
  status: 'published',
  defaultLocale: 'es',
  content: {
    es: {
      title: 'Fundación Batis',
      location: 'Puerto Colombia',
      theme: 'Manglar',
      description: 'Restauración de manglar.',
      waysToContribute: ['Conocer'],
    },
  },
  firstPublishedAt: '2026-11-01T00:00:00.000Z',
  partnershipStatus: 'structuring',
} as unknown as ProjectRecord;

const enterprise = {
  id: 'e1',
  slug: 'hoteles-taybo',
  displayName: 'Hoteles Taybo',
  status: 'active',
} as EnterpriseRecord;

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

function setup(hosts: Record<string, string[]> = {}) {
  const audits: AuditInput[] = [];
  const calls: Record<string, unknown[][]> = {};
  const record =
    (name: string, result?: unknown) =>
    async (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return result;
    };
  const service = new MarketplaceAdminService({
    audit: async (input: AuditInput) => {
      audits.push(input);
    },
    actorHasScope: async () => true,
    findProject: async () => project,
    findEnterprise: async (id: string) => (id === enterprise.id ? enterprise : null),
    updateEnterprise: record('updateEnterprise', enterprise),
    createEnterprise: record('createEnterprise', enterprise),
    updateProject: record('updateProject', project),
    updateProjectProfile: record('updateProjectProfile'),
    linkEnterprise: record('linkEnterprise'),
    unlinkEnterprise: record('unlinkEnterprise'),
    listProducts: async () => [{ id: 'prod1', enterpriseId: 'e1', airsMin: 25, airsMax: 125 }],
    createProduct: record('createProduct', { id: 'prod2' }),
    updateProduct: record('updateProduct', { id: 'prod1' }),
    deleteProduct: record('deleteProduct'),
    allowedHosts: async (kind: string) => hosts[kind] ?? [],
    createSignedUpload: record('createSignedUpload', {
      uploadUrl: `https://${STORAGE_HOST}/storage/v1/object/upload/sign/x?token=t`,
      token: 't',
      path: 'x',
      publicUrl: `https://${STORAGE_HOST}/storage/v1/object/public/marketplace-media/x`,
    }),
    ensureAllowedHost: record('ensureAllowedHost'),
  } as any);
  return { service, audits, calls };
}

test('only global admins write partnership status and team-only fields', async () => {
  for (const field of ['partnershipStatus', 'internalContacts', 'pendingItems', 'internalNotes']) {
    const value = field === 'internalNotes' ? 'x' : field === 'partnershipStatus' ? 'signed' : [];
    const { service } = setup();
    await assert.rejects(
      service.updateEnterprise(principal('partner_operator'), 'r', 'e1', { [field]: value } as any),
      expectApiError('PROTECTED_FIELD_WRITE_DENIED')
    );
    await assert.rejects(
      service.updateProject(principal('partner_operator'), 'r', 'p1', { [field]: value } as any),
      expectApiError('PROTECTED_FIELD_WRITE_DENIED')
    );
  }
  const { service, calls } = setup();
  await service.updateEnterprise(principal('partner_operator'), 'r', 'e1', {
    sector: 'Hotelería',
    publicContact: { phone: 'POR CONFIRMAR' },
  } as any);
  assert.deepEqual(calls.updateEnterprise[0][1], {
    sector: 'Hotelería',
    publicContact: { phone: 'POR CONFIRMAR' },
  });
});

test('project profile fields skip the content RPC and are audited on their own', async () => {
  const { service, calls, audits } = setup();
  await service.updateProject(principal('internal_admin'), 'r', 'p1', {
    alternateName: 'TEPAG',
    pendingItems: ['Logo'],
  } as any);
  assert.equal(calls.updateProject, undefined);
  assert.deepEqual(calls.updateProjectProfile[0][1], {
    alternateName: 'TEPAG',
    pendingItems: ['Logo'],
  });
  assert.equal(audits.at(-1)?.action, 'project.profile_updated');

  await service.updateProject(principal('internal_admin'), 'r', 'p1', {
    content: project.content,
    alternateName: 'TEPAG',
  } as any);
  assert.deepEqual(Object.keys(calls.updateProject[0][1] as object), ['content']);
});

test('enterprise logo and banner must be https on an allowed host; empty clears them', async () => {
  const { service, calls } = setup({ logo: ['cdn.example'], cover: ['cdn.example'] });
  const admin = principal('platform_owner');
  await assert.rejects(
    service.updateEnterprise(admin, 'r', 'e1', { logoUrl: 'https://evil.example/a.png' } as any),
    expectApiError('MEDIA_HOST_NOT_ALLOWED')
  );
  await assert.rejects(
    service.updateEnterprise(admin, 'r', 'e1', { bannerUrl: 'http://cdn.example/a.png' } as any),
    expectApiError('MEDIA_URL_INVALID')
  );
  await service.updateEnterprise(admin, 'r', 'e1', {
    logoUrl: 'https://cdn.example/a.png',
    bannerUrl: '',
  } as any);
  assert.deepEqual(calls.updateEnterprise[0][1], {
    logoUrl: 'https://cdn.example/a.png',
    bannerUrl: null,
  });
});

test('linking enterprises is reserved to global admins and never touches the primary owner', async () => {
  const { service, calls } = setup();
  await assert.rejects(
    service.linkEnterprise(principal('partner_operator'), 'r', 'p1', 'e1', { relation: 'sponsor' }),
    expectApiError('PERMISSION_DENIED')
  );
  await assert.rejects(
    service.linkEnterprise(principal('platform_owner'), 'r', 'p1', 'alternun', {
      relation: 'sponsor',
    }),
    expectApiError('ENTERPRISE_RELATION_CONFLICT')
  );
  await assert.rejects(
    service.unlinkEnterprise(principal('platform_owner'), 'r', 'p1', 'alternun'),
    expectApiError('ENTERPRISE_RELATION_CONFLICT')
  );
  await assert.rejects(
    service.linkEnterprise(principal('platform_owner'), 'r', 'p1', 'missing', {
      relation: 'sponsor',
    }),
    expectApiError('ENTERPRISE_NOT_FOUND')
  );
  await service.linkEnterprise(principal('platform_owner'), 'r', 'p1', 'e1', {
    relation: 'sponsor',
  });
  assert.deepEqual(calls.linkEnterprise[0].slice(0, 3), ['p1', 'e1', 'sponsor']);
  await service.unlinkEnterprise(principal('internal_admin'), 'r', 'p1', 'e1');
  assert.deepEqual(calls.unlinkEnterprise[0], ['p1', 'e1']);
});

test('products validate their Airs range and are audited', async () => {
  const { service, audits, calls } = setup();
  const admin = principal('platform_owner');
  await assert.rejects(
    service.createProduct(admin, 'r', 'e1', { name: 'Séptico', airsMin: 125, airsMax: 25 }),
    expectApiError('VALIDATION_FAILED')
  );
  await service.createProduct(admin, 'r', 'e1', { name: 'Séptico', airsMin: 25, airsMax: 125 });
  // The merged range is checked against the stored values.
  await assert.rejects(
    service.updateProduct(admin, 'r', 'e1', 'prod1', { airsMin: 200 }),
    expectApiError('VALIDATION_FAILED')
  );
  await assert.rejects(
    service.updateProduct(admin, 'r', 'e1', 'missing', { name: 'x' }),
    expectApiError('PRODUCT_NOT_FOUND')
  );
  await service.updateProduct(admin, 'r', 'e1', 'prod1', { airsNote: 'según capacidad' });
  await service.deleteProduct(admin, 'r', 'e1', 'prod1');
  assert.deepEqual(calls.deleteProduct[0], ['e1', 'prod1']);
  assert.deepEqual(
    audits.map(({ action }) => action),
    ['enterprise_product.created', 'enterprise_product.updated', 'enterprise_product.deleted']
  );
});

test('upload URLs are scoped by target and allow the storage host for that media kind', async () => {
  const { service, calls } = setup();
  const admin = principal('platform_owner');
  await assert.rejects(
    service.createUploadUrl(
      admin,
      'r',
      { type: 'project', id: 'p1' },
      {
        kind: 'banner',
        contentType: 'image/png',
      }
    ),
    expectApiError('VALIDATION_FAILED')
  );
  await assert.rejects(
    service.createUploadUrl(
      admin,
      'r',
      { type: 'enterprise', id: 'e1' },
      {
        kind: 'gallery_image',
        contentType: 'image/png',
      }
    ),
    expectApiError('VALIDATION_FAILED')
  );
  await assert.rejects(
    service.createUploadUrl(
      admin,
      'r',
      { type: 'project', id: 'p1' },
      {
        kind: 'cover',
        contentType: 'image/svg+xml' as any,
      }
    ),
    expectApiError('VALIDATION_FAILED')
  );

  const upload = await service.createUploadUrl(
    admin,
    'r',
    { type: 'project', id: 'p1' },
    {
      kind: 'cover',
      contentType: 'image/webp',
    }
  );
  assert.match(upload.publicUrl, /marketplace-media/);
  const [bucket, path] = calls.createSignedUpload[0] as [string, string];
  assert.equal(bucket, 'marketplace-media');
  assert.match(path, /^projects\/p1\/cover\/[0-9a-f-]{36}\.webp$/);
  assert.deepEqual(calls.ensureAllowedHost[0], [['cover'], STORAGE_HOST]);

  await service.createUploadUrl(
    admin,
    'r',
    { type: 'enterprise', id: 'e1' },
    {
      kind: 'banner',
      contentType: 'image/jpeg',
    }
  );
  assert.match(calls.createSignedUpload[1][1] as string, /^enterprises\/e1\/banner\/.+\.jpg$/);
  assert.deepEqual(calls.ensureAllowedHost[1], [['cover'], STORAGE_HOST]);
});

test('moderators cannot upload brand images for a project', async () => {
  const { service } = setup();
  await assert.rejects(
    service.createUploadUrl(
      principal('moderator'),
      'r',
      { type: 'project', id: 'p1' },
      {
        kind: 'logo',
        contentType: 'image/png',
      }
    ),
    (error: unknown) => error instanceof MarketplaceApiError
  );
});

test('empty optional profile text clears the stored value', async () => {
  const { service, calls } = setup();
  await service.updateEnterprise(principal('platform_owner'), 'r', 'e1', {
    sector: ' ',
    description: '',
    internalNotes: '',
  } as any);
  assert.deepEqual(calls.updateEnterprise[0][1], {
    sector: null,
    description: null,
    internalNotes: null,
  });
  await service.updateProject(principal('platform_owner'), 'r', 'p1', { alternateName: '' } as any);
  assert.deepEqual(calls.updateProjectProfile[0][1], { alternateName: null });
});
