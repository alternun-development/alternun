/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { AdminPrincipal } from '../src/common/admin-auth/admin-auth.guard';
import {
  CreateUploadUrlDto,
  UpdateEnterpriseDto,
  UpdateEnterpriseProductDto,
} from '../src/modules/marketplace/marketplace.dto';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import {
  MarketplaceAdminRepository,
  type MarketplacePublicRepository,
} from '../src/modules/marketplace/marketplace.repository';
import {
  MarketplaceAdminService,
  MarketplacePublicService,
} from '../src/modules/marketplace/marketplace.service';
import type {
  EnterpriseProductRecord,
  EnterpriseRecord,
  ProjectRecord,
} from '../src/modules/marketplace/marketplace.types';

const enterprise = {
  id: 'e1',
  slug: 'swing-golf-colombia',
  displayName: 'Swing Golf Colombia',
  status: 'active',
  sortOrder: 0,
  sector: 'Golf',
  description: 'Torneos de golf en Colombia.',
} as EnterpriseRecord;

const project = {
  id: 'p1',
  enterpriseId: enterprise.id,
  slug: 'torneo-swing-golf',
  status: 'published',
  defaultLocale: 'es',
  content: {
    es: {
      title: 'Torneo',
      location: 'Bogotá',
      theme: 'Golf',
      description: 'Torneo de golf.',
      waysToContribute: ['Jugar'],
    },
  },
} as unknown as ProjectRecord;

const product = {
  id: 'prod1',
  enterpriseId: enterprise.id,
  name: 'Inscripción al torneo',
  description: 'Incluye green fee',
  airsMin: 10,
  airsMax: null,
  airsNote: 'por jugador',
  isActive: true,
} as EnterpriseProductRecord;

function publicService(
  listed: EnterpriseRecord,
  products: EnterpriseProductRecord[] = []
): MarketplacePublicService {
  return new MarketplacePublicService({
    listPublished: async () => [{ project, enterprise: listed, media: [] }],
    listAffiliations: async () => [],
    listActiveProducts: async () => products,
  } as unknown as MarketplacePublicRepository);
}

function principal(...roles: string[]): AdminPrincipal {
  return { iss: 'issuer', aud: 'admin', sub: 'subject', roles, organizationIds: [] };
}

function expectApiError(code: string) {
  return (error: unknown) => error instanceof MarketplaceApiError && error.code === code;
}

function adminService(hosts: Record<string, string[]> = {}) {
  const calls: Record<string, unknown[][]> = {};
  const hostLookups: string[] = [];
  const record =
    (name: string, result?: unknown) =>
    async (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return result;
    };
  const service = new MarketplaceAdminService({
    audit: async () => undefined,
    actorHasScope: async () => true,
    findEnterprise: async () => enterprise,
    updateEnterprise: record('updateEnterprise', enterprise),
    listProducts: async () => [product],
    createProduct: record('createProduct', product),
    updateProduct: record('updateProduct', product),
    allowedHosts: async (kind: string) => {
      hostLookups.push(kind);
      return hosts[kind] ?? [];
    },
    createSignedUpload: record('createSignedUpload', {
      uploadUrl: 'https://devref.supabase.co/storage/v1/object/upload/sign/x?token=t',
      token: 't',
      path: 'x',
      publicUrl: 'https://devref.supabase.co/storage/v1/object/public/marketplace-media/x',
    }),
    ensureAllowedHost: record('ensureAllowedHost'),
  } as any);
  return { service, calls, hostLookups };
}

test('the public gallery keeps safe https photos in order and names unnamed ones', async () => {
  const detail = await publicService({
    ...enterprise,
    gallery: [
      { url: 'https://cdn.example/salida.jpg', altText: 'Salida del hoyo 1' },
      { url: 'http://cdn.example/insegura.jpg', altText: 'Insegura' },
      { url: 'https://user:secret@cdn.example/credenciales.jpg', altText: 'Credenciales' },
      { url: 'https://cdn.example/green.jpg', altText: '' },
    ],
  }).findEnterpriseBySlug(enterprise.slug, 'es');
  assert.deepEqual(detail.gallery, [
    { url: 'https://cdn.example/salida.jpg', altText: 'Salida del hoyo 1' },
    { url: 'https://cdn.example/green.jpg', altText: 'Swing Golf Colombia' },
  ]);
});

test('enterprise and product text follow the reader language field by field', async () => {
  const service = publicService(
    { ...enterprise, translations: { en: { description: 'Golf tournaments in Colombia.' } } },
    [{ ...product, translations: { en: { name: 'Tournament entry', airsNote: 'per player' } } }]
  );

  const english = await service.findEnterpriseBySlug(enterprise.slug, 'en');
  assert.equal(english.description, 'Golf tournaments in Colombia.');
  // Fields without an English version show the Spanish base text.
  assert.equal(english.sector, 'Golf');
  assert.deepEqual(english.products, [
    {
      id: 'prod1',
      name: 'Tournament entry',
      description: 'Incluye green fee',
      airsMin: 10,
      airsMax: null,
      airsNote: 'per player',
    },
  ]);

  const spanish = await service.findEnterpriseBySlug(enterprise.slug, 'es');
  assert.equal(spanish.description, 'Torneos de golf en Colombia.');
  assert.equal(spanish.products[0].name, 'Inscripción al torneo');
  // Thai readers get English while there is no Thai version, like projects.
  const thai = await service.findEnterpriseBySlug(enterprise.slug, 'th');
  assert.equal(thai.description, 'Golf tournaments in Colombia.');
  // Without a locale query the browser language decides.
  const browser = await service.findEnterpriseBySlug(enterprise.slug, undefined, 'es-CO,es;q=0.9');
  assert.equal(browser.description, 'Torneos de golf en Colombia.');
  assert.equal(
    (await service.listEnterprises('en')).data[0].description,
    'Golf tournaments in Colombia.'
  );
});

test('gallery photos must be https on an allowed gallery host; the list is saved as sent', async () => {
  const admin = principal('partner_operator');
  const gallery = [
    { url: 'https://cdn.example/a.jpg', altText: 'Campo' },
    { url: 'https://cdn.example/b.jpg', altText: '' },
  ];
  const { service, calls, hostLookups } = adminService({ gallery_image: ['cdn.example'] });
  await assert.rejects(
    service.updateEnterprise(admin, 'r', 'e1', {
      gallery: [...gallery, { url: 'https://evil.example/c.jpg', altText: '' }],
    } as any),
    expectApiError('MEDIA_HOST_NOT_ALLOWED')
  );
  await assert.rejects(
    service.updateEnterprise(admin, 'r', 'e1', {
      gallery: [{ url: 'http://cdn.example/a.jpg', altText: '' }],
    } as any),
    expectApiError('MEDIA_URL_INVALID')
  );
  await assert.rejects(
    service.updateEnterprise(admin, 'r', 'e1', {
      gallery: [{ url: 'https://127.0.0.1/a.jpg', altText: '' }],
    } as any),
    expectApiError('MEDIA_URL_INVALID')
  );
  hostLookups.length = 0;
  await service.updateEnterprise(admin, 'r', 'e1', {
    gallery,
    translations: { en: { description: 'Golf tournaments.' } },
  } as any);
  // The allowlist is read once per media kind, not once per photo.
  assert.deepEqual(hostLookups, ['gallery_image']);
  assert.deepEqual(calls.updateEnterprise[0][1], {
    gallery,
    translations: { en: { description: 'Golf tournaments.' } },
  });
});

test('enterprise gallery uploads go to their own folder on the gallery host allowlist', async () => {
  const { service, calls } = adminService();
  await service.createUploadUrl(
    principal('platform_owner'),
    'r',
    { type: 'enterprise', id: 'e1' },
    { kind: 'gallery', contentType: 'image/jpeg' }
  );
  assert.match(calls.createSignedUpload[0][1] as string, /^enterprises\/e1\/gallery\/.+\.jpg$/);
  assert.deepEqual(calls.ensureAllowedHost[0], [['gallery_image'], 'devref.supabase.co']);
  // Projects keep their own gallery kind.
  await assert.rejects(
    service.createUploadUrl(
      principal('platform_owner'),
      'r',
      { type: 'project', id: 'p1' },
      { kind: 'gallery', contentType: 'image/jpeg' }
    ),
    expectApiError('VALIDATION_FAILED')
  );
});

test('the DTOs accept English and Thai translations only, within the base column limits', () => {
  const errors = (dto: new () => object, body: object) =>
    validateSync(plainToInstance(dto, body) as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  assert.deepEqual(
    errors(UpdateEnterpriseDto, {
      translations: { en: { sector: 'Golf', description: 'x' }, th: { description: 'y' } },
      gallery: [{ url: 'https://cdn.example/a.jpg', altText: 'Campo' }],
    }),
    []
  );
  assert.deepEqual(
    errors(UpdateEnterpriseProductDto, {
      translations: { en: { name: 'Entry', description: 'x', airsNote: 'per player' } },
    }),
    []
  );
  for (const body of [
    { translations: { fr: { description: 'x' } } },
    { translations: { en: { title: 'x' } } },
    { translations: { en: { sector: 'x'.repeat(161) } } },
    { translations: { en: { description: 'x'.repeat(4001) } } },
    { translations: [] },
    { gallery: [{ url: '', altText: '' }] },
    { gallery: [{ url: 'https://cdn.example/a.jpg' }] },
    { gallery: [{ url: 'https://cdn.example/a.jpg', altText: 'x'.repeat(241) }] },
    {
      gallery: Array.from({ length: 13 }, (_, index) => ({
        url: `https://cdn.example/${index}.jpg`,
        altText: '',
      })),
    },
  ])
    assert.notDeepEqual(errors(UpdateEnterpriseDto, body), [], JSON.stringify(body).slice(0, 80));
  for (const body of [
    { translations: { de: { name: 'x' } } },
    { translations: { en: { name: 'x'.repeat(161) } } },
    { translations: { en: { description: 'x'.repeat(1001) } } },
    { translations: { en: { airsNote: 'x'.repeat(161) } } },
  ])
    assert.notDeepEqual(errors(UpdateEnterpriseProductDto, body), []);
  assert.deepEqual(errors(CreateUploadUrlDto, { kind: 'gallery', contentType: 'image/png' }), []);
});

test('the repository writes and reads the gallery and translations', async () => {
  const writes: Array<{ table: string; values: unknown }> = [];
  const rows: Record<string, unknown> = {
    enterprises: {
      id: 'e1',
      gallery: [{ url: 'https://cdn.example/a.jpg', altText: 'Campo' }, { url: 42 }, 'x'],
      translations: { en: { description: 'Golf.', sector: ' ' }, th: 'x' },
    },
    enterprise_products: {
      id: 'prod1',
      name: 'Inscripción',
      translations: { en: { name: 'Entry', airsNote: 7 } },
    },
  };
  const client = {
    from(table: string) {
      const query = {
        update(values: unknown) {
          writes.push({ table, values });
          return query;
        },
        eq: () => query,
        select: () => query,
        maybeSingle: async () => ({ data: rows[table], error: null }),
      };
      return query;
    },
  };
  const repository = new MarketplaceAdminRepository(client as never);
  const actor = { issuer: 'issuer', subject: 'subject', roles: ['platform_owner'] };

  const saved = await repository.updateEnterprise(
    'e1',
    { gallery: [{ url: 'https://cdn.example/a.jpg', altText: 'Campo' }], translations: {} },
    actor
  );
  assert.deepEqual(writes[0].values, {
    gallery: [{ url: 'https://cdn.example/a.jpg', altText: 'Campo' }],
    translations: {},
    updated_by_issuer: 'issuer',
    updated_by_subject: 'subject',
  });
  // Malformed photos and blank or non-text translations are left out.
  assert.deepEqual(saved.gallery, [{ url: 'https://cdn.example/a.jpg', altText: 'Campo' }]);
  assert.deepEqual(saved.translations, { en: { description: 'Golf.' }, th: {} });

  const savedProduct = await repository.updateProduct(
    'e1',
    'prod1',
    { translations: { en: { name: 'Entry' } } },
    actor
  );
  assert.deepEqual(writes[1].values, {
    translations: { en: { name: 'Entry' } },
    updated_by_issuer: 'issuer',
    updated_by_subject: 'subject',
  });
  assert.deepEqual(savedProduct.translations, { en: { name: 'Entry' } });
});
