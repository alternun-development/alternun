import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

// Adds environment-specific image hosts (for example the stage's own storage
// host) to project_media_allowed_hosts. Hosts shared by every environment live
// in supabase/migrations instead.

const IMAGE_MEDIA_KINDS = ['logo', 'cover', 'gallery_image'];
const HOST_LABEL = '[a-z0-9](?:[a-z0-9-]*[a-z0-9])?';
const EXACT_HOST_PATTERN = new RegExp(`^${HOST_LABEL}(?:\\.${HOST_LABEL})+$`);

export function parseImageHosts(value) {
  const hosts = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const host of hosts) {
    if (!EXACT_HOST_PATTERN.test(host)) {
      throw new Error(
        `Invalid project media host "${host}". Use exact lowercase hostnames without scheme, port, path or wildcard.`
      );
    }
  }

  return [...new Set(hosts)];
}

function createPoolConfig(urlValue) {
  return {
    connectionString: urlValue,
    ssl: urlValue.includes('supabase') ? { rejectUnauthorized: false } : false,
  };
}

async function main() {
  const hosts = parseImageHosts(process.env.INFRA_PROJECT_MEDIA_IMAGE_HOSTS);
  if (hosts.length === 0) {
    console.log('ℹ️  INFRA_PROJECT_MEDIA_IMAGE_HOSTS is empty; no environment image hosts to seed');
    return;
  }

  const databaseUrl =
    process.env.MIGRATION_DATABASE_URL ||
    process.env.INFRA_BACKEND_API_DATABASE_URL ||
    process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'MIGRATION_DATABASE_URL, INFRA_BACKEND_API_DATABASE_URL, or DATABASE_URL is required'
    );
  }

  const pool = new Pool(createPoolConfig(databaseUrl));
  try {
    const result = await pool.query(
      `insert into public.project_media_allowed_hosts (media_kind, host)
       select kind, host
       from unnest($1::text[]) as kind
       cross join unnest($2::text[]) as host
       on conflict (media_kind, host) do nothing`,
      [IMAGE_MEDIA_KINDS, hosts]
    );
    console.log(
      `✅ Project media image hosts ready (${hosts.length} host(s), ${
        result.rowCount ?? 0
      } new row(s))`
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
