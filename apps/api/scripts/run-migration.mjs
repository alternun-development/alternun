import { readFileSync } from 'fs';
import { Pool } from 'pg';

const databaseUrl =
  process.env.INFRA_BACKEND_API_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error(
    '❌ INFRA_BACKEND_API_DATABASE_URL, DATABASE_URL, or SUPABASE_DATABASE_URL is required'
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
    };
  } catch {
    return {
      connectionString: urlValue,
      ssl: urlValue.includes('supabase') ? { rejectUnauthorized: false } : false,
    };
  }
}

const pool = new Pool({
  ...createPoolConfig(databaseUrl),
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const migrationSql = readFileSync('./supabase/migrations/20260417_0009_create_better_auth_tables.sql', 'utf-8');
    console.log('Running migration...');
    await client.query(migrationSql);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
