import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let viteServer;
let profile;
let api;
let enterpriseProfile;
let projectProfile;

const enterprise = {
  id: 'e1',
  slug: 'hoteles-taybo',
  displayName: 'Hoteles Taybo',
  legalName: null,
  status: 'active',
  countryCode: 'CO',
  websiteUrl: null,
  kind: 'company',
  sector: 'Hotelería',
  description: null,
  partnershipStatus: 'onboarding',
  location: { municipality: 'Santa Marta' },
  publicContact: { email: 'comercial@sthoteles.co' },
  logoUrl: null,
  bannerUrl: null,
  eventDetails: {},
  sites: [{ name: 'Hotel Taybo Kai', address: 'Cra. 2 #5-60', rooms: 26 }],
  internalContacts: [{ name: 'Gloria Castro', role: 'Contacto de la alianza' }],
  pendingItems: ['Teléfono oficial'],
  internalNotes: null,
};

const project = {
  id: 'p1',
  enterpriseId: 'alternun',
  slug: 'fundacion-rio-gaira',
  status: 'published',
  categoryCode: 'conservation',
  countryCode: 'CO',
  timeZone: 'America/Bogota',
  defaultLocale: 'es',
  content: {},
  alternateName: null,
  partnershipStatus: 'structuring',
  locationDetails: { municipality: 'Santa Marta' },
  publicContact: { web: 'POR CONFIRMAR' },
  internalContacts: [],
  pendingItems: [],
  internalNotes: null,
  enterprises: [
    { enterpriseId: 'alternun', isPrimary: true, relation: 'owner' },
    { enterpriseId: 'e1', isPrimary: false, relation: 'sponsor' },
    { enterpriseId: 'unknown', isPrimary: false, relation: 'partner' },
  ],
};

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  profile = await viteServer.ssrLoadModule('/src/marketplace/profile.ts');
  api = await viteServer.ssrLoadModule('/src/marketplace/api.ts');
  enterpriseProfile = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/enterprise-profile-editor.tsx'
  );
  projectProfile = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/project-profile-editor.tsx'
  );
});

after(async () => {
  await viteServer?.close();
});

void test('list fields round-trip through their one-per-line text format', () => {
  const sites = [
    { name: 'Hotel Taybo Kai', address: 'Cra. 2 #5-60', rooms: 26 },
    { name: 'Hotel Taybo Beach', address: 'Calle 6 #2-43' },
    { name: 'POR CONFIRMAR' },
  ];
  assert.deepEqual(profile.parseSites(profile.formatSites(sites)), sites);
  assert.deepEqual(profile.parseSites('Sede | | abc\n\n'), [{ name: 'Sede' }]);

  const contacts = [
    { name: 'Gloria Castro', role: 'Contacto de la alianza' },
    { name: 'Alejandro Arévalo', role: 'Director comercial', email: 'dir@sthoteles.com' },
  ];
  assert.deepEqual(
    profile.parseInternalContacts(profile.formatInternalContacts(contacts)),
    contacts
  );
  assert.deepEqual(profile.parseLines(' Logo \n\nContacto '), ['Logo', 'Contacto']);
  assert.equal(profile.formatLines(undefined), '');
});

void test('compactRecord drops empty values and changedFields keeps only real changes', () => {
  assert.deepEqual(
    profile.compactRecord({ web: ' https://x.test ', email: ' ', phone: undefined }),
    {
      web: 'https://x.test',
    }
  );
  assert.deepEqual(
    profile.changedFields({ a: 'x', b: { c: 1 }, d: [] }, { a: 'x', b: { c: 2 }, d: [] }),
    { b: { c: 2 } }
  );
});

void test('product drafts validate Airs and build create and update bodies', () => {
  const draft = { ...profile.productDraft(), name: ' Noche ', airsMin: '5', airsNote: 'por noche' };
  assert.equal(profile.validateProductDraft(draft), null);
  assert.equal(profile.validateProductDraft({ ...draft, name: ' ' }), 'name');
  assert.equal(profile.validateProductDraft({ ...draft, airsMin: '5.5' }), 'airs');
  assert.equal(profile.validateProductDraft({ ...draft, airsMin: '10', airsMax: '5' }), 'airs');
  assert.deepEqual(profile.productCreateBody(draft), {
    name: 'Noche',
    airsMin: 5,
    airsNote: 'por noche',
    isActive: true,
  });
  assert.deepEqual(profile.productBody(draft), {
    name: 'Noche',
    description: null,
    airsMin: 5,
    airsMax: null,
    airsNote: 'por noche',
    isActive: true,
  });
  assert.deepEqual(
    profile.productDraft({
      id: 'x',
      name: 'A',
      description: null,
      airsMin: 0,
      airsMax: null,
      airsNote: null,
      sortOrder: 0,
      isActive: false,
    }),
    { name: 'A', description: '', airsMin: '0', airsMax: '', airsNote: '', isActive: false }
  );
});

void test('uploads accept only JPG, PNG and WebP up to 5 MB', () => {
  assert.equal(api.uploadFileProblem({ type: 'image/png', size: 1024 }), null);
  assert.equal(api.uploadFileProblem({ type: 'image/svg+xml', size: 1024 }), 'type');
  assert.equal(api.uploadFileProblem({ type: 'image/webp', size: 5 * 1024 * 1024 + 1 }), 'size');
});

void test('an unchanged enterprise profile produces no patch', () => {
  const draft = enterpriseProfile.enterpriseProfileDraft(enterprise);
  assert.deepEqual(enterpriseProfile.enterpriseProfilePatch(enterprise, draft, true), {});
});

void test('enterprise profile patch sends changes and keeps team-only fields for global admins', () => {
  const draft = {
    ...enterpriseProfile.enterpriseProfileDraft(enterprise),
    description: ' Hoteles en El Rodadero ',
    phone: 'POR CONFIRMAR',
    bannerUrl: 'https://dev.supabase.co/storage/v1/object/public/marketplace-media/b.png',
    pendingItems: 'Teléfono oficial\nNombres de las sedes',
    partnershipStatus: 'signed',
  };
  assert.deepEqual(enterpriseProfile.enterpriseProfilePatch(enterprise, draft, true), {
    description: 'Hoteles en El Rodadero',
    publicContact: { email: 'comercial@sthoteles.co', phone: 'POR CONFIRMAR' },
    bannerUrl: 'https://dev.supabase.co/storage/v1/object/public/marketplace-media/b.png',
    partnershipStatus: 'signed',
    pendingItems: ['Teléfono oficial', 'Nombres de las sedes'],
  });
  assert.deepEqual(enterpriseProfile.enterpriseProfilePatch(enterprise, draft, false), {
    description: 'Hoteles en El Rodadero',
    publicContact: { email: 'comercial@sthoteles.co', phone: 'POR CONFIRMAR' },
    bannerUrl: 'https://dev.supabase.co/storage/v1/object/public/marketplace-media/b.png',
  });
});

void test('event details are only sent for events', () => {
  const draft = {
    ...enterpriseProfile.enterpriseProfileDraft(enterprise),
    kind: 'event',
    eventDate: 'POR CONFIRMAR',
    venueName: 'Club El Rincón de Cajicá',
  };
  const patch = enterpriseProfile.enterpriseProfilePatch(enterprise, draft, true);
  assert.equal(patch.kind, 'event');
  assert.deepEqual(patch.eventDetails, {
    date: 'POR CONFIRMAR',
    venue: { name: 'Club El Rincón de Cajicá' },
  });
});

void test('project profile patch and the allied enterprise list', () => {
  const draft = {
    ...projectProfile.projectProfileDraft(project),
    alternateName: 'TEPAG',
    email: 'info@rio.test',
    internalNotes: 'Pedir logo a Gloria',
  };
  assert.deepEqual(projectProfile.projectProfilePatch(project, draft, false), {
    alternateName: 'TEPAG',
    publicContact: { web: 'POR CONFIRMAR', email: 'info@rio.test' },
  });
  assert.equal(
    projectProfile.projectProfilePatch(project, draft, true).internalNotes,
    'Pedir logo a Gloria'
  );
  assert.deepEqual(
    projectProfile.linkedEnterprises(project, [enterprise, { ...enterprise, id: 'alternun' }]),
    [{ enterprise, relation: 'sponsor' }]
  );
});
