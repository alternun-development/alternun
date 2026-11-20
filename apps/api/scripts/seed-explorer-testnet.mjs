import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

// Loads the testnet explorer mini-pages (impact projects and allied enterprises) into the
// DEVELOPMENT database only. Production is refused: nothing here is published there until each
// organization signs and authorizes its name, logo and texts.
//
// Usage:
//   node scripts/seed-explorer-testnet.mjs [--file <json>] [--update] [--dry-run]
// The JSON holds team-only contacts, so it lives in scripts/data/*.local.json (git-ignored).
// By default existing rows (same slug) are left untouched; --update overwrites them with the file.

const DEVELOPMENT_SUPABASE_REF = 'aznfyazjndfniwsocdka';
const SEED_SUBJECT = 'seed-explorer-testnet';
const DEFAULT_FILE = 'scripts/data/explorer-testnet.local.json';
const OWNER_SLUG = 'alternun';

const PARTNERSHIP_STATUS = {
  en_estructuracion: 'structuring',
  en_conversacion: 'in_conversation',
  onboarding_sin_firma: 'onboarding',
  piloto_aceptado: 'pilot',
  aplazado: 'postponed',
  firmado: 'signed',
};

const PROJECT_CATEGORY = {
  'fundacion-batis': 'conservation',
  'corporacion-tapegua': 'community',
  'fundacion-salva-terra': 'community',
  'fundacion-rio-gaira': 'conservation',
  'reforestacion-la-matilde': 'conservation',
};

// Location notes are team context by default; these describe where the project works and stay public.
const PUBLIC_COVERAGE_NOTES = new Set(['fundacion-salva-terra']);

const WAYS_TO_CONTRIBUTE = ['Conoce el proyecto', 'Suma Airs con los aliados del proyecto'];

function compact(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function httpsOrNull(value) {
  return typeof value === 'string' && /^https:\/\/\S+$/.test(value) ? value : null;
}

function publicContact(contact = {}) {
  return compact({
    web: contact.web,
    email: contact.correo,
    phone: contact.telefono,
    whatsapp: contact.whatsapp,
    instagram: contact.instagram,
    facebook: contact.facebook,
  });
}

function internalContacts(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map((contact) =>
    compact({ name: contact.nombre, role: contact.rol ?? contact.cargo, email: contact.correo })
  );
}

function notes(...values) {
  const joined = values.filter(Boolean).join('\n');
  return joined || null;
}

/** "25 a 125 según capacidad" → 25..125; "mínimo 5 por noche" → 5..; 15 → 15..15; else a note. */
export function parseAirs(value) {
  if (typeof value === 'number') return { airsMin: value, airsMax: value, airsNote: null };
  const text = String(value ?? '').trim();
  const range = text.match(/^(\d+)\s*a\s*(\d+)\s*(.*)$/i);
  if (range)
    return { airsMin: Number(range[1]), airsMax: Number(range[2]), airsNote: range[3] || null };
  const minimum = text.match(/^m[ií]nimo\s+(\d+)\s*(.*)$/i);
  if (minimum) return { airsMin: Number(minimum[1]), airsMax: null, airsNote: minimum[2] || null };
  return { airsMin: null, airsMax: null, airsNote: text || null };
}

export function buildSeedPlan(data) {
  const projects = data.proyectos.map((item) => {
    const location = item.ubicacion ?? {};
    const coverageIsPublic = PUBLIC_COVERAGE_NOTES.has(item.id);
    const category = PROJECT_CATEGORY[item.id];
    if (!category) throw new Error(`No category mapped for project "${item.id}"`);
    return {
      slug: item.id,
      categoryCode: category,
      alternateName: item.nombre_alternativo ?? null,
      partnershipStatus: PARTNERSHIP_STATUS[item.estado] ?? 'structuring',
      content: {
        es: {
          title: item.nombre,
          location: [location.municipio, location.departamento].filter(Boolean).join(', '),
          theme: item.categoria,
          description: item.descripcion,
          waysToContribute: WAYS_TO_CONTRIBUTE,
        },
      },
      locationDetails: compact({
        municipality: location.municipio,
        department: location.departamento,
        address: location.direccion,
        coverage: coverageIsPublic ? location.nota : undefined,
      }),
      publicContact: publicContact(item.contacto_publico),
      internalContacts: internalContacts(item.contacto_interno),
      pendingItems: item.pendientes ?? [],
      internalNotes: notes(coverageIsPublic ? null : location.nota),
      logoUrl: httpsOrNull(item.logo_url),
      logoAlt: `Logo de ${item.nombre}`,
    };
  });

  const projectSlugs = new Set(projects.map(({ slug }) => slug));
  const enterprises = data.aliados.map((item) => {
    if (item.proyecto_asociado && !projectSlugs.has(item.proyecto_asociado))
      throw new Error(`Ally "${item.id}" points to unknown project "${item.proyecto_asociado}"`);
    const location = item.ubicacion ?? {};
    const venue = item.sede;
    return {
      slug: item.id,
      displayName: item.nombre,
      legalName: item.razon_social ?? null,
      kind: item.tipo === 'evento' ? 'event' : 'company',
      sector: item.sector ?? null,
      description: item.descripcion ?? null,
      partnershipStatus: PARTNERSHIP_STATUS[item.estado] ?? 'in_conversation',
      location: compact({
        municipality: location.municipio ?? venue?.municipio,
        department: location.departamento ?? venue?.departamento,
        address: location.direccion,
        coverage: location.cobertura,
      }),
      publicContact: publicContact(item.contacto_publico),
      websiteUrl: httpsOrNull(item.contacto_publico?.web),
      logoUrl: httpsOrNull(item.logo_url),
      eventDetails: venue
        ? compact({
            date: item.fecha,
            venue: compact({
              name: venue.nombre,
              address: venue.direccion,
              municipality: venue.municipio,
              department: venue.departamento,
              web: venue.web,
            }),
          })
        : {},
      sites: (item.sedes ?? []).map((site) =>
        compact({
          name: site.nombre,
          address: site.direccion,
          rooms: site.habitaciones,
          web: site.web,
        })
      ),
      internalContacts: internalContacts(item.contacto_interno),
      pendingItems: item.pendientes ?? [],
      internalNotes: notes(
        location.nota,
        item.contacto_publico?.nota,
        item.logo_nota,
        item.beneficio_equipo && `Beneficio para el equipo: ${item.beneficio_equipo}`
      ),
      products: (item.productos ?? []).map((product, index) => ({
        name: product.nombre,
        description: product.descripcion ?? null,
        ...parseAirs(product.airs),
        sortOrder: index,
      })),
      projectSlug: item.proyecto_asociado ?? null,
    };
  });

  const logoHosts = [
    ...new Set(
      [...projects, ...enterprises]
        .map(({ logoUrl }) => logoUrl && new URL(logoUrl).hostname.toLowerCase())
        .filter(Boolean)
    ),
  ];
  return { projects, enterprises, logoHosts };
}

export function assertDevelopmentDatabase(databaseUrl) {
  if (databaseUrl.includes(DEVELOPMENT_SUPABASE_REF)) return;
  const { hostname } = new URL(databaseUrl);
  if (hostname === 'localhost' || hostname === '127.0.0.1') return;
  throw new Error(
    `Refusing to seed "${hostname}": the explorer testnet data only goes to the development database.`
  );
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function seed(client, plan, { update }) {
  const owner = await client.query('select id, status from public.enterprises where slug = $1', [
    OWNER_SLUG,
  ]);
  if (owner.rowCount === 0 || owner.rows[0].status !== 'active')
    throw new Error(`The "${OWNER_SLUG}" enterprise must exist and be active to own the projects.`);
  const ownerId = owner.rows[0].id;
  const summary = { projectsCreated: 0, enterprisesCreated: 0, updated: 0 };

  await client.query(
    `insert into public.project_media_allowed_hosts (media_kind, host)
     select 'logo', host from unnest($1::text[]) as host
     on conflict (media_kind, host) do nothing`,
    [plan.logoHosts]
  );

  const projectIds = new Map();
  for (const project of plan.projects) {
    const values = [
      project.slug,
      project.categoryCode,
      JSON.stringify(project.content),
      project.alternateName,
      project.partnershipStatus,
      JSON.stringify(project.locationDetails),
      JSON.stringify(project.publicContact),
      JSON.stringify(project.internalContacts),
      project.pendingItems,
      project.internalNotes,
    ];
    const inserted = await client.query(
      `insert into public.projects (
         slug, status, category_code, country_code, time_zone, default_locale, content,
         alternate_name, partnership_status, location_details, public_contact, internal_contacts,
         pending_items, internal_notes, first_published_at, published_at, sort_order,
         created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject)
       values ($1, 'published', $2, 'CO', 'America/Bogota', 'es', $3::jsonb, $4, $5, $6::jsonb,
         $7::jsonb, $8::jsonb, $9, $10, now(), now(),
         (select coalesce(max(sort_order) + 1, 0) from public.projects),
         'system', $11, 'system', $12)
       on conflict (slug) do nothing
       returning id`,
      [...values, SEED_SUBJECT, SEED_SUBJECT]
    );
    let id = inserted.rows[0]?.id;
    if (id) {
      summary.projectsCreated += 1;
    } else {
      id = (await client.query('select id from public.projects where slug = $1', [project.slug]))
        .rows[0].id;
      if (update) {
        await client.query(
          `update public.projects set category_code = $2, content = $3::jsonb, alternate_name = $4,
             partnership_status = $5, location_details = $6::jsonb, public_contact = $7::jsonb,
             internal_contacts = $8::jsonb, pending_items = $9, internal_notes = $10,
             updated_by_issuer = 'system', updated_by_subject = $11
           where slug = $1 and id = $12`,
          [...values, SEED_SUBJECT, id]
        );
        summary.updated += 1;
      }
    }
    projectIds.set(project.slug, id);

    await client.query(
      `insert into public.enterprise_projects
         (enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject)
       values ($1, $2, 'owner', true, 'system', $3)
       on conflict (enterprise_id, project_id) do nothing`,
      [ownerId, id, SEED_SUBJECT]
    );

    if (project.logoUrl) {
      await client.query(
        `insert into public.project_media
           (project_id, kind, url, alt_text, created_by_issuer, created_by_subject,
            updated_by_issuer, updated_by_subject)
         select $1, 'logo', $2, jsonb_build_object('es', $3::text), 'system', $4, 'system', $4
         where not exists (
           select 1 from public.project_media
           where project_id = $1 and kind = 'logo' and is_active
         )`,
        [id, project.logoUrl, project.logoAlt, SEED_SUBJECT]
      );
    }
  }

  for (const enterprise of plan.enterprises) {
    const values = [
      enterprise.slug,
      enterprise.displayName,
      enterprise.legalName,
      enterprise.kind,
      enterprise.sector,
      enterprise.description,
      enterprise.partnershipStatus,
      JSON.stringify(enterprise.location),
      JSON.stringify(enterprise.publicContact),
      enterprise.websiteUrl,
      enterprise.logoUrl,
      JSON.stringify(enterprise.eventDetails),
      JSON.stringify(enterprise.sites),
      JSON.stringify(enterprise.internalContacts),
      enterprise.pendingItems,
      enterprise.internalNotes,
    ];
    const inserted = await client.query(
      `insert into public.enterprises (
         slug, display_name, legal_name, kind, sector, description, partnership_status, location,
         public_contact, website_url, logo_url, event_details, sites, internal_contacts,
         pending_items, internal_notes, status, country_code, sort_order,
         created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb,
         $14::jsonb, $15, $16, 'active', 'CO',
         (select coalesce(max(sort_order) + 1, 0) from public.enterprises),
         'system', $17, 'system', $17)
       on conflict (slug) do nothing
       returning id`,
      [...values, SEED_SUBJECT]
    );
    let id = inserted.rows[0]?.id;
    const created = Boolean(id);
    if (created) {
      summary.enterprisesCreated += 1;
    } else {
      id = (
        await client.query('select id from public.enterprises where slug = $1', [enterprise.slug])
      ).rows[0].id;
      if (update) {
        await client.query(
          `update public.enterprises set display_name = $2, legal_name = $3, kind = $4, sector = $5,
             description = $6, partnership_status = $7, location = $8::jsonb,
             public_contact = $9::jsonb, website_url = $10, logo_url = $11,
             event_details = $12::jsonb, sites = $13::jsonb, internal_contacts = $14::jsonb,
             pending_items = $15, internal_notes = $16,
             updated_by_issuer = 'system', updated_by_subject = $17
           where slug = $1`,
          [...values, SEED_SUBJECT]
        );
        await client.query(
          'delete from public.enterprise_products where enterprise_id = $1 and created_by_subject = $2',
          [id, SEED_SUBJECT]
        );
        summary.updated += 1;
      }
    }

    if (created || update) {
      for (const product of enterprise.products) {
        await client.query(
          `insert into public.enterprise_products
             (enterprise_id, name, description, airs_min, airs_max, airs_note, sort_order,
              created_by_issuer, created_by_subject, updated_by_issuer, updated_by_subject)
           values ($1, $2, $3, $4, $5, $6, $7, 'system', $8, 'system', $8)`,
          [
            id,
            product.name,
            product.description,
            product.airsMin,
            product.airsMax,
            product.airsNote,
            product.sortOrder,
            SEED_SUBJECT,
          ]
        );
      }
    }

    if (enterprise.projectSlug) {
      await client.query(
        `insert into public.enterprise_projects
           (enterprise_id, project_id, relation, is_primary, created_by_issuer, created_by_subject)
         values ($1, $2, 'sponsor', false, 'system', $3)
         on conflict (enterprise_id, project_id) do nothing`,
        [id, projectIds.get(enterprise.projectSlug), SEED_SUBJECT]
      );
    }
  }
  return summary;
}

async function main() {
  const file = resolve(argument('--file') ?? DEFAULT_FILE);
  const plan = buildSeedPlan(JSON.parse(readFileSync(file, 'utf8')));
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const databaseUrl =
    process.env.MIGRATION_DATABASE_URL ??
    process.env.DATABASE_URL_DEV ??
    process.env.INFRA_BACKEND_API_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Set MIGRATION_DATABASE_URL or DATABASE_URL_DEV.');
  assertDevelopmentDatabase(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const summary = await seed(client, plan, { update: process.argv.includes('--update') });
    await client.query("notify pgrst, 'reload schema'");
    await client.query('commit');
    console.log('✅ Explorer testnet data loaded', summary);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  });
}
