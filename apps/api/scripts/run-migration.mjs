import { readFileSync } from 'fs';
import { Pool } from 'pg';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:E~)V96LKh;yOOM.Kq&u&@db.rjebeugdvwbjpaktrrbx.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
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
