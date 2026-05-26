import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ||
  process.env.INFRA_BACKEND_API_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL;

const migrationArg = process.argv[2] ?? 'supabase/migrations/20260417_0009_create_better_auth_tables.sql';
const migrationPath = isAbsolute(migrationArg) ? migrationArg : resolve(repoRoot, migrationArg);

if (!databaseUrl) {
  console.error(
    '❌ MIGRATION_DATABASE_URL, INFRA_BACKEND_API_DATABASE_URL, DATABASE_URL, or SUPABASE_DATABASE_URL is required'
  );
  process.exit(1);
}

function createPoolConfig(urlValue) {
  try {
    const parsed = new URL(urlValue);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      database: parsed.pathname.replace(/^\/+/, '') || undefined,
      ssl: parsed.hostname.includes('supabase') ? { rejectUnauthorized: false } : false,
      options: '-c search_path=public',
    };
  } catch {
    return {
      connectionString: urlValue,
      ssl: urlValue.includes('supabase') ? { rejectUnauthorized: false } : false,
      options: '-c search_path=public',
    };
  }
}

function parseMigrationFile(filePath) {
  const fileName = filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
  const match = fileName.match(/^(\d+_\d+)_(.+)\.sql$/);

  if (!match) {
    throw new Error(
      `Invalid migration filename: ${fileName}. Use format: YYYYMMDD_NNNN_description.sql`
    );
  }

  const [, version, name] = match;

  return {
    version: version ?? '0',
    name: name ?? 'unknown',
    fileName,
  };
}

async function ensureMigrationsTable(client) {
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

async function runMigration() {
  const { version, name, fileName } = parseMigrationFile(migrationPath);
  const pool = new Pool({
    ...createPoolConfig(databaseUrl),
  });

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const applied = await client.query('SELECT 1 FROM _migrations WHERE version = $1 LIMIT 1', [
      version,
    ]);

    if (applied.rowCount > 0) {
      console.log(`ℹ️  Migration already applied: ${version}_${name}`);
      return;
    }

    const migrationSql = readFileSync(migrationPath, 'utf-8');

    console.log(`Running migration: ${fileName}`);
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('INSERT INTO _migrations (name, version) VALUES ($1, $2)', [name, version]);
    await client.query('COMMIT');
    console.log(`✅ Migration completed successfully: ${version}_${name}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
