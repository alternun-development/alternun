/* eslint-disable */
const assert = require('node:assert/strict');
const { test } = require('node:test');

const load = () => import('../scripts/seed-explorer-testnet.mjs');

const data = {
  proyectos: [
    {
      id: 'fundacion-batis',
      nombre: 'Fundación Batis',
      categoria: 'Manglar',
      descripcion: 'Restaura manglar.',
      ubicacion: {
        municipio: 'Puerto Colombia',
        departamento: 'Atlántico',
        nota: 'Nota del equipo',
      },
      contacto_publico: { web: 'https://batisbatis.org', correo: 'info@batisbatis.org' },
      contacto_interno: { nombre: 'Persona', cargo: 'Dirección', correo: 'p@batisbatis.org' },
      logo_url: 'https://batisbatis.org/logo.png',
      estado: 'en_estructuracion',
      pendientes: ['Convenio'],
    },
    {
      id: 'fundacion-salva-terra',
      nombre: 'Fundación Salva Terra',
      nombre_alternativo: 'Fundación Salvaterra',
      categoria: 'Campo',
      descripcion: 'Familias campesinas.',
      ubicacion: { municipio: 'Medellín', departamento: 'Antioquia', nota: 'Trabaja en Urabá.' },
      contacto_publico: { web: 'POR CONFIRMAR' },
      contacto_interno: null,
      logo_url: '',
      estado: 'en_estructuracion',
    },
  ],
  aliados: [
    {
      id: 'torneo-golf',
      nombre: 'Torneo',
      tipo: 'evento',
      sector: 'Golf',
      fecha: 'POR CONFIRMAR',
      sede: { nombre: 'Club', municipio: 'Cajicá', departamento: 'Cundinamarca' },
      contacto_publico: { web: 'POR CONFIRMAR' },
      productos: [{ nombre: 'Podio', descripcion: 'Oro', airs: 15 }],
      proyecto_asociado: 'fundacion-batis',
      estado: 'aplazado',
    },
    {
      id: 'hotel',
      nombre: 'Hotel',
      razon_social: 'Hotel S.A.S.',
      tipo: 'empresa',
      ubicacion: { municipio: 'Santa Marta', nota: 'Sedes por confirmar' },
      sedes: [
        { nombre: 'Sede 1', habitaciones: 26 },
        { nombre: 'Sede 2', habitaciones: null },
      ],
      contacto_publico: { web: 'https://hotel.example', nota: 'Dos dominios' },
      contacto_interno: [{ nombre: 'Gloria', rol: 'Alianza' }],
      logo_nota: 'Logos por correo',
      beneficio_equipo: 'Beneficio de recepción',
      productos: [{ nombre: 'Noche', airs: 'mínimo 5 por noche' }],
      proyecto_asociado: 'fundacion-batis',
      estado: 'onboarding_sin_firma',
    },
  ],
};

test('Airs per product are parsed into a range and a note', async () => {
  const { parseAirs } = await load();
  assert.deepEqual(parseAirs(5), { airsMin: 5, airsMax: 5, airsNote: null });
  assert.deepEqual(parseAirs('25 a 125 según capacidad (propuesta)'), {
    airsMin: 25,
    airsMax: 125,
    airsNote: 'según capacidad (propuesta)',
  });
  assert.deepEqual(parseAirs('mínimo 5 por noche'), {
    airsMin: 5,
    airsMax: null,
    airsNote: 'por noche',
  });
  assert.deepEqual(parseAirs('POR DEFINIR'), {
    airsMin: null,
    airsMax: null,
    airsNote: 'POR DEFINIR',
  });
});

test('the seed plan keeps team-only data out of public fields', async () => {
  const { buildSeedPlan } = await load();
  const plan = buildSeedPlan(data);
  const [batis, salvaTerra] = plan.projects;

  assert.equal(batis.content.es.location, 'Puerto Colombia, Atlántico');
  assert.equal(batis.partnershipStatus, 'structuring');
  assert.deepEqual(batis.internalContacts, [
    { name: 'Persona', role: 'Dirección', email: 'p@batisbatis.org' },
  ]);
  // Location notes are team context unless the project is listed as public coverage.
  assert.equal(batis.internalNotes, 'Nota del equipo');
  assert.equal(batis.locationDetails.coverage, undefined);
  assert.equal(salvaTerra.locationDetails.coverage, 'Trabaja en Urabá.');
  assert.equal(salvaTerra.internalNotes, null);
  assert.equal(salvaTerra.logoUrl, null);
  assert.equal(salvaTerra.alternateName, 'Fundación Salvaterra');

  const [event, hotel] = plan.enterprises;
  assert.equal(event.kind, 'event');
  assert.equal(event.partnershipStatus, 'postponed');
  assert.equal(event.websiteUrl, null);
  assert.deepEqual(event.eventDetails, {
    date: 'POR CONFIRMAR',
    venue: { name: 'Club', municipality: 'Cajicá', department: 'Cundinamarca' },
  });
  assert.deepEqual(event.location, { municipality: 'Cajicá', department: 'Cundinamarca' });

  assert.equal(hotel.partnershipStatus, 'onboarding');
  assert.equal(hotel.websiteUrl, 'https://hotel.example');
  assert.deepEqual(hotel.publicContact, { web: 'https://hotel.example' });
  assert.deepEqual(hotel.sites, [{ name: 'Sede 1', rooms: 26 }, { name: 'Sede 2' }]);
  assert.match(hotel.internalNotes, /Sedes por confirmar/);
  assert.match(hotel.internalNotes, /Dos dominios/);
  assert.match(hotel.internalNotes, /Beneficio de recepción/);
  assert.deepEqual(hotel.products[0], {
    name: 'Noche',
    description: null,
    airsMin: 5,
    airsMax: null,
    airsNote: 'por noche',
    sortOrder: 0,
  });
  assert.deepEqual(plan.logoHosts, ['batisbatis.org']);
});

test('the seed plan rejects allies pointing to unknown projects and unmapped categories', async () => {
  const { buildSeedPlan } = await load();
  assert.throws(
    () => buildSeedPlan({ ...data, aliados: [{ ...data.aliados[0], proyecto_asociado: 'nope' }] }),
    /unknown project "nope"/
  );
  assert.throws(
    () => buildSeedPlan({ proyectos: [{ ...data.proyectos[0], id: 'other' }], aliados: [] }),
    /No category mapped/
  );
});

test('the seed only targets the development database', async () => {
  const { assertDevelopmentDatabase } = await load();
  assert.doesNotThrow(() =>
    assertDevelopmentDatabase('postgresql://u:p@db.aznfyazjndfniwsocdka.supabase.co:5432/postgres')
  );
  assert.doesNotThrow(() => assertDevelopmentDatabase('postgresql://u:p@localhost:5432/postgres'));
  assert.throws(
    () =>
      assertDevelopmentDatabase(
        'postgresql://u:p@db.rjebeugdvwbjpaktrrbx.supabase.co:5432/postgres'
      ),
    /Refusing to seed/
  );
});
