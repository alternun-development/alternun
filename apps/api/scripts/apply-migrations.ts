/* eslint-disable no-console */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';
import '../src/bootstrap-env';

// Detect environment from DATABASE_URL
function detectEnvironment(databaseUrl: string): 'production' | 'development' {
  if (
    databaseUrl.includes('rjebeugdvwbjpaktrrbx') ||
    databaseUrl.includes('PROD') ||
    process.env.NODE_ENV === 'production'
  ) {
    return 'production';
  }
  return 'development';
}

const databaseUrl =
  process.env.INFRA_BACKEND_API_DATABASE_URL ??
  process.env.DATABASE_URL_DEV ??
  process.env.DATABASE_URL_DEV_IPV4 ??
  process.env.DATABASE_URL_DEV_NOIPV4 ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DATABASE_URL;

const skippedMigrationVersions = new Set(['20260417_0009', '20260417_0010']);
const dryRun = process.argv.includes('--dry-run');

if (!databaseUrl) {
  console.error(
    '❌ INFRA_BACKEND_API_DATABASE_URL, DATABASE_URL_DEV, DATABASE_URL_DEV_IPV4, DATABASE_URL_DEV_NOIPV4, DATABASE_URL, or SUPABASE_DATABASE_URL not set'
  );
  process.exit(1);
}

const environment = detectEnvironment(databaseUrl);
const databaseHost = new URL(databaseUrl).hostname;

const MIGRATIONS_DIR = resolve('../../supabase/migrations');

function createPoolConfig(databaseUrl: string): ConstructorParameters<typeof Pool>[0] {
  const searchPathOptions = '-c search_path=public';

  try {
    const url = new URL(databaseUrl);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      database: url.pathname.replace(/^\/+/, '') || undefined,
      ssl: url.hostname.includes('supabase') ? { rejectUnauthorized: false } : false,
      options: searchPathOptions,
    };
  } catch {
    return {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
      options: searchPathOptions,
    };
  }
}

interface Migration {
  name: string;
  version: string;
  path: string;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const tableExists = await client
    .query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '_migrations'
      );`
    )
    .then((res) => (res.rows[0] as Record<string, boolean> | undefined)?.exists ?? false);

  if (!tableExists) {
    console.log('📋 Creating _migrations tracking table...');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        version VARCHAR(50) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
  }
}

async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  try {
    const result = await client.query('SELECT version FROM _migrations ORDER BY version');
    return new Set(result.rows.map((row) => (row as Record<string, string>).version));
  } catch {
    return new Set();
  }
}

function getMigrationFiles(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files
    .map((file) => {
      const match = file.match(/^(\d+_\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(
          `Invalid migration filename: ${file}. Use format: YYYYMMDD_NNNN_description.sql`
        );
      }
      const [, version, name] = match;
      return {
        name: name ?? 'unknown',
        version: version ?? '0',
        path: resolve(MIGRATIONS_DIR, file),
      };
    })
    .filter((migration) => !skippedMigrationVersions.has(migration.version));
}

async function runMigration(client: PoolClient, migration: Migration): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const sql = readFileSync(migration.path, 'utf-8');

  console.log(`🔄 Running migration: ${migration.version}_${migration.name}`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  await client.query(sql);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  await client.query('INSERT INTO _migrations (name, version) VALUES ($1, $2)', [
    migration.name,
    migration.version,
  ]);

  console.log(`✅ Applied: ${migration.version}_${migration.name}`);
}

async function applyMigrations(): Promise<void> {
  // Display environment and safety warnings
  console.log('\n🔧 Database Migration Tool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(
    `🌍 Environment: ${environment === 'production' ? '🔴 PRODUCTION' : '🟢 DEVELOPMENT'}`
  );
  console.log(`🖥️  Host: ${databaseHost}`);
  if (dryRun) {
    console.log('📋 Mode: DRY RUN (no changes will be applied)');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Safety check for production
  if (environment === 'production' && !process.env.APPROVE_PROD_MIGRATION) {
    console.warn(
      '⚠️  PRODUCTION MIGRATION DETECTED!\n' +
        'To confirm, set environment variable: APPROVE_PROD_MIGRATION=true\n' +
        'Example: APPROVE_PROD_MIGRATION=true pnpm db:migrate'
    );
    process.exit(1);
  }

  const pool = new Pool(createPoolConfig(databaseUrl));

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database');

    await ensureMigrationsTable(client);

    const appliedMigrations = await getAppliedMigrations(client);
    const availableMigrations = getMigrationFiles();

    const pendingMigrations = availableMigrations.filter(
      (migration) => !appliedMigrations.has(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✨ Database is up to date. No migrations to apply.');
      return;
    }

    console.log(`\n📦 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach((m) => {
      console.log(`   • ${m.version}_${m.name}`);
    });
    console.log('');

    if (dryRun) {
      console.log('📋 DRY RUN: Migrations listed above would be applied.');
      console.log('   Run without --dry-run to actually apply them.');
      return;
    }

    for (const migration of pendingMigrations) {
      await runMigration(client, migration);
    }

    console.log(`\n✨ All ${pendingMigrations.length} migration(s) completed successfully! ✅`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

void applyMigrations();
