/* eslint-disable no-console */
/**
 * Lambda initialization handler for database migrations.
 * Run migrations before the API server starts.
 *
 * Usage in main.ts:
 *   await initMigrations();
 *   const app = await createApp();
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, type PoolClient } from 'pg';

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
  try {
    const migrationsDir = resolve('./supabase/migrations');
    const files = readdirSync(migrationsDir)
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
        path: resolve(migrationsDir, file),
      };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function runMigration(client: PoolClient, migration: Migration): Promise<void> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const sql = readFileSync(migration.path, 'utf-8');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  await client.query(sql);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  await client.query('INSERT INTO _migrations (name, version) VALUES ($1, $2)', [
    migration.name,
    migration.version,
  ]);
}

export async function initMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

  if (!databaseUrl) {
    console.warn('⚠️  DATABASE_URL not set, skipping migrations');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
    max: 1,
  });

  let client;
  try {
    client = await pool.connect();

    await ensureMigrationsTable(client);

    const appliedMigrations = await getAppliedMigrations(client);
    const availableMigrations = getMigrationFiles();

    const pendingMigrations = availableMigrations.filter(
      (migration) => !appliedMigrations.has(migration.version)
    );

    if (pendingMigrations.length > 0) {
      console.log(`[migrations] Found ${pendingMigrations.length} pending migration(s)`);

      for (const migration of pendingMigrations) {
        console.log(`[migrations] Applying: ${migration.version}_${migration.name}`);
        await runMigration(client, migration);
      }

      console.log(`[migrations] All ${pendingMigrations.length} migration(s) applied`);
    }
  } catch (error) {
    console.error('[migrations] Failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}
