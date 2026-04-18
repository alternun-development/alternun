import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as betterAuthSchema from './better-auth.schema';

let db: ReturnType<typeof drizzle> | null = null;

export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    db = drizzle(pool, { schema: betterAuthSchema });
  }

  return db;
}
