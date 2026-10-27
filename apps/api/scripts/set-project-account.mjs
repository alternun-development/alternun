import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

// Links each project with its own Airs account (public.projects.project_account_user_id).
// The pairs come from INFRA_PROJECT_ACCOUNT_EMAILS, a comma-separated list of
// `project-slug=account@email`, so no address lives in the repository. The account must
// already exist and have a verified email: the person (or mailbox) signs in once first.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseProjectAccounts(value) {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const accounts = new Map();
  for (const entry of entries) {
    const separator = entry.indexOf('=');
    const slug = separator > 0 ? entry.slice(0, separator).trim() : '';
    const email = separator > 0 ? entry.slice(separator + 1).trim().toLowerCase() : '';
    if (!SLUG_PATTERN.test(slug) || !EMAIL_PATTERN.test(email) || email.length > 320) {
      throw new Error(
        `Invalid project account entry "${entry}". Use project-slug=account@email, comma separated.`
      );
    }
    if (accounts.has(slug) && accounts.get(slug) !== email) {
      throw new Error(`Project "${slug}" is listed with two different accounts.`);
    }
    accounts.set(slug, email);
  }

  return [...accounts].map(([slug, email]) => ({ slug, email }));
}

function createPoolConfig(urlValue) {
  return {
    connectionString: urlValue,
    ssl: urlValue.includes('supabase') ? { rejectUnauthorized: false } : false,
  };
}

export async function linkProjectAccounts(pool, accounts) {
  const outcomes = [];
  for (const { slug, email } of accounts) {
    const project = await pool.query('select id from public.projects where slug = $1', [slug]);
    if (project.rowCount === 0) {
      outcomes.push({ slug, email, status: 'project_not_found' });
      continue;
    }

    const user = await pool.query(
      `select id::text as id
         from public.users
        where lower(btrim(email)) = $1 and email_verified = true
        order by created_at, id
        limit 1`,
      [email]
    );
    if (user.rowCount === 0) {
      outcomes.push({ slug, email, status: 'account_not_found' });
      continue;
    }

    const result = await pool.query(
      `update public.projects
          set project_account_user_id = $2
        where slug = $1 and project_account_user_id is distinct from $2`,
      [slug, user.rows[0].id]
    );
    outcomes.push({ slug, email, status: result.rowCount === 0 ? 'unchanged' : 'linked' });
  }
  return outcomes;
}

async function main() {
  const accounts = parseProjectAccounts(process.env.INFRA_PROJECT_ACCOUNT_EMAILS);
  if (accounts.length === 0) {
    console.log('ℹ️  INFRA_PROJECT_ACCOUNT_EMAILS is empty; no project accounts to link');
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
    const outcomes = await linkProjectAccounts(pool, accounts);
    for (const { slug, status } of outcomes) {
      console.log(`${status === 'linked' || status === 'unchanged' ? '✅' : '⚠️ '} ${slug}: ${status}`);
    }
    if (outcomes.some(({ status }) => status !== 'linked' && status !== 'unchanged')) {
      process.exitCode = 1;
    }
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
