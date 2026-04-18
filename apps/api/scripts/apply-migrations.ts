/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or SUPABASE_DATABASE_URL not set');
  process.exit(1);
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

    const migrationSql = readFileSync(
      './supabase/migrations/20260417_0009_create_better_auth_tables.sql',
      'utf-8'
    );
    console.log('🚀 Running migration: 20260417_0009_create_better_auth_tables.sql');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await client.query(migrationSql);
    console.log('✅ Migration completed successfully!');
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
