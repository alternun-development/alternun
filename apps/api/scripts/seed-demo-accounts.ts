/* eslint-disable no-console */
/**
 * Demo accounts for testing every role on testnet (development database only).
 *
 *   node -r ts-node/register/transpile-only scripts/seed-demo-accounts.ts --out <file.json>
 *
 * Creates (or resets the password of) Supabase Auth email/password accounts with a confirmed
 * email, through the Auth admin API, so no email is sent. The auth.users trigger creates the
 * matching public.users row (same id); then each account gets its role. Re-running is safe: memberships, the
 * participant and the global admin row are only added when missing. Passwords are random,
 * written only to --out (never to the repository), and change on every run.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { Client } from 'pg';
import '../src/bootstrap-env';

const DEVELOPMENT_REF = 'aznfyazjndfniwsocdka';
const GRANTOR = 'demo-seed';

type Grant =
  | { kind: 'membership'; role: string; enterprise: string; project?: string }
  | { kind: 'global'; role: 'internal_admin' }
  | { kind: 'participant'; project: string }
  | { kind: 'none' };

interface DemoAccount {
  email: string;
  name: string;
  description: string;
  grant: Grant;
}

const ACCOUNTS: DemoAccount[] = [
  {
    email: 'global-admin@alternun.co',
    name: 'Demo Admin Global',
    description: 'Admin global de Alternun: ve y edita todo, crea empresas y proyectos.',
    grant: { kind: 'global', role: 'internal_admin' },
  },
  {
    email: 'batis-admin@alternun.co',
    name: 'Demo Admin Batis',
    description:
      'Admin del proyecto Fundación Batis: edita todo el proyecto, imágenes, equipo (agrega sub admins y moderadores), clientes y Airs.',
    grant: {
      kind: 'membership',
      role: 'partner_operator',
      enterprise: 'alternun',
      project: 'fundacion-batis',
    },
  },
  {
    email: 'batis-subadmin@alternun.co',
    name: 'Demo Sub Admin Batis',
    description:
      'Sub admin de Fundación Batis: edita contenido, imágenes, clientes y Airs; no cambia el equipo ni los datos de contacto.',
    grant: {
      kind: 'membership',
      role: 'sub_admin',
      enterprise: 'alternun',
      project: 'fundacion-batis',
    },
  },
  {
    email: 'batis-moderator@alternun.co',
    name: 'Demo Moderador Batis',
    description:
      'Moderador de Fundación Batis: modera comentarios e imágenes; ve los clientes sin editarlos.',
    grant: {
      kind: 'membership',
      role: 'project_moderator',
      enterprise: 'alternun',
      project: 'fundacion-batis',
    },
  },
  {
    email: 'batis-viewer@alternun.co',
    name: 'Demo Solo Lectura Batis',
    description: 'Solo lectura de Fundación Batis: no tiene vista de gestión en la app.',
    grant: {
      kind: 'membership',
      role: 'partner_readonly',
      enterprise: 'alternun',
      project: 'fundacion-batis',
    },
  },
  {
    email: 'taybo-admin@alternun.co',
    name: 'Demo Admin Taybo',
    description:
      'Admin de la empresa Hoteles Taybo: edita la empresa, sus productos, su equipo y sus clientes.',
    grant: { kind: 'membership', role: 'partner_operator', enterprise: 'hoteles-taybo' },
  },
  {
    email: 'usuario1@alternun.co',
    name: 'Demo Usuario Uno',
    description: 'Usuario general, ya es cliente de Fundación Batis.',
    grant: { kind: 'participant', project: 'fundacion-batis' },
  },
  {
    email: 'usuario2@alternun.co',
    name: 'Demo Usuario Dos',
    description: 'Usuario general sin roles: para agregarlo como cliente o asignarle Airs.',
    grant: { kind: 'none' },
  },
];

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function upsertAuthUser(db: Client, account: DemoAccount, secret: string): Promise<string> {
  const base = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!base.includes(DEVELOPMENT_REF) || !key)
    throw new Error('SUPABASE_URL must be the development project, with its service role key.');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const existing = await db.query<{ id: string }>(
    'select id::text from auth.users where lower(email) = lower($1)',
    [account.email]
  );
  const id = existing.rows[0]?.id;
  const response = await fetch(`${base}/auth/v1/admin/users${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify({
      email: account.email,
      password: secret,
      email_confirm: true,
      user_metadata: { name: account.name },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; msg?: string };
  if (!response.ok || !body.id)
    throw new Error(
      `Auth admin API failed for ${account.email}: ${response.status} ${body.msg ?? ''}`
    );
  return body.id;
}

function password(): string {
  return `Airs-${randomBytes(9).toString('base64url')}`;
}

async function main(): Promise<void> {
  const databaseUrl =
    process.env.MIGRATION_DATABASE_URL ??
    process.env.INFRA_BACKEND_API_DATABASE_URL ??
    process.env.DATABASE_URL_DEV ??
    process.env.DATABASE_URL;
  if (!databaseUrl?.includes(DEVELOPMENT_REF)) {
    throw new Error('Refusing to seed demo accounts outside the development (testnet) database.');
  }
  const out = argument('--out');
  if (!out) throw new Error('Pass --out <file.json> to receive the generated passwords.');

  const issuer = (process.env.ADMIN_AUTH_ISSUER ?? '').trim() || 'airs-app';
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const credentials: Array<{ email: string; password: string; role: string; description: string }> =
    [];

  try {
    await client.query('begin');
    for (const account of ACCOUNTS) {
      const secret = password();
      const authId = await upsertAuthUser(client, account, secret);
      const user = await client.query<{ id: string; sub: string }>(
        `update public.users set name = $2, email_verified = true where id::text = $1
         returning id::text, sub`,
        [authId, account.name]
      );
      if (!user.rows[0]) throw new Error(`No app user was synced for ${account.email}`);
      const { id, sub } = user.rows[0];

      const grant = account.grant;
      let role = 'usuario';
      if (grant.kind === 'global') {
        role = grant.role;
        await client.query(
          `insert into public.platform_admins (email, role) values ($1, $2)
           on conflict (email) do update set role = excluded.role, is_active = true`,
          [account.email, grant.role]
        );
      } else if (grant.kind === 'membership') {
        role = grant.role;
        const scope = await client.query<{ enterprise_id: string; project_id: string | null }>(
          `select enterprise.id::text enterprise_id, project.id::text project_id
           from public.enterprises enterprise
           left join public.projects project on project.slug = $2
           where enterprise.slug = $1`,
          [grant.enterprise, grant.project ?? null]
        );
        const target = scope.rows[0];
        if (!target || (grant.project && !target.project_id))
          throw new Error(
            `Missing ${grant.enterprise}/${grant.project ?? ''} for ${account.email}`
          );
        await client.query(
          `insert into public.project_memberships (
             member_issuer, member_subject, member_user_id, enterprise_id, project_id,
             scope_type, role, granted_by_issuer, granted_by_subject
           )
           select $1, $2, $3, $4::uuid, $5::uuid, $6, $7, 'system', $8
           where not exists (
             select 1 from public.project_memberships membership
             where membership.member_user_id = $3 and membership.enterprise_id = $4::uuid
               and membership.project_id is not distinct from $5::uuid
               and membership.role = $7 and membership.status = 'active'
           )`,
          [
            issuer,
            sub,
            id,
            target.enterprise_id,
            target.project_id,
            grant.project ? 'project' : 'enterprise',
            grant.role,
            GRANTOR,
          ]
        );
      } else if (grant.kind === 'participant') {
        role = `usuario (cliente de ${grant.project})`;
        await client.query(
          `insert into public.project_participants (project_id, user_id, added_by_issuer, added_by_subject)
           select project.id, $1, 'system', $3
           from public.projects project
           where project.slug = $2
             and not exists (
               select 1 from public.project_participants participant
               where participant.project_id = project.id and participant.user_id = $1
                 and participant.status = 'active'
             )`,
          [id, grant.project, GRANTOR]
        );
      }
      credentials.push({
        email: account.email,
        password: secret,
        role,
        description: account.description,
      });
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }

  writeFileSync(out, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  console.log(`✅ ${credentials.length} demo accounts ready; passwords written to ${out}`);
}

main().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
