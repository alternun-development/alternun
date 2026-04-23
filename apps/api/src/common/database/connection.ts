import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as betterAuthSchema from './better-auth.schema';

let db: ReturnType<typeof drizzle> | null = null;

function isTestnetAlignedDatabaseEnv(env: NodeJS.ProcessEnv): boolean {
  const stage = (env.SST_STAGE ?? env.STACK ?? '').trim().toLowerCase().replace(/_/g, '-');

  return (
    env.ALTERNUN_TESTNET_MODE === 'on' ||
    stage === 'dev' ||
    stage === 'testnet' ||
    stage.includes('testnet') ||
    stage.endsWith('-dev')
  );
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const databaseCandidates = isTestnetAlignedDatabaseEnv(env)
    ? [
        env.INFRA_BACKEND_API_DATABASE_URL,
        env.DATABASE_URL_DEV,
        env.DATABASE_URL_DEV_IPV4,
        env.DATABASE_URL_DEV_NOIPV4,
      ]
    : [
        env.INFRA_BACKEND_API_DATABASE_URL,
        env.DATABASE_URL_DEV,
        env.DATABASE_URL_DEV_IPV4,
        env.DATABASE_URL_DEV_NOIPV4,
        env.DATABASE_URL,
        env.SUPABASE_DATABASE_URL,
      ];

  const databaseUrl = databaseCandidates
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));

  return databaseUrl ?? null;
}

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

export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    const databaseUrl = resolveDatabaseUrl();

    if (!databaseUrl) {
      throw new Error(
        'No database URL is configured. Set INFRA_BACKEND_API_DATABASE_URL for testnet-aligned stages, DATABASE_URL_DEV / DATABASE_URL_DEV_IPV4 / DATABASE_URL_DEV_NOIPV4 for local testnet/dev, or DATABASE_URL/SUPABASE_DATABASE_URL for shared runtimes.'
      );
    }

    const pool = new Pool(createPoolConfig(databaseUrl));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    db = drizzle(pool, { schema: betterAuthSchema });
  }

  return db;
}
