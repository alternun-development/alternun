/* eslint-disable no-console */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or SUPABASE_DATABASE_URL not set');
  process.exit(1);
}

const MIGRATIONS_DIR = resolve('../../supabase/migrations');

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

  return files.map((file) => {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
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
  });
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
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

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

    console.log(`\n📦 Found ${pendingMigrations.length} pending migration(s)\n`);

    for (const migration of pendingMigrations) {
      await runMigration(client, migration);
    }

    console.log(`\n✨ All ${pendingMigrations.length} migration(s) completed successfully!`);
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
