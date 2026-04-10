import { createHash } from 'node:crypto';

export interface SupabaseOidcSyncInput {
  sub: string;
  iss: string;
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  picture?: string | null;
  provider?: string | null;
  rawClaims?: Record<string, unknown>;
}

export interface SupabaseOidcSyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export function resolveSupabaseOidcSyncConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseOidcSyncConfig | null {
  const supabaseUrl = (env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseKey = (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_KEY ??
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

function stablePrincipalId(issuer: string, subject: string): string {
  const hash = createHash('sha256').update(`${issuer}:${subject}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function toOidcClaims(input: SupabaseOidcSyncInput): Record<string, unknown> {
  return {
    sub: input.sub,
    iss: input.iss,
    email: input.email ?? null,
    email_verified: Boolean(input.emailVerified),
    name: input.name ?? null,
    picture: input.picture ?? null,
    ...(input.rawClaims ?? {}),
  };
}

export function buildCompatOidcPayload(input: SupabaseOidcSyncInput): {
  principalId: string;
  payload: Record<string, unknown>;
} {
  const principalId = stablePrincipalId(input.iss, input.sub);
  const claims = toOidcClaims(input);

  return {
    principalId,
    payload: {
      p_sub: principalId,
      p_iss: input.iss,
      p_email: claims.email ?? null,
      p_email_verified: claims.email_verified ?? false,
      p_name: input.name ?? null,
      p_picture: input.picture ?? null,
      p_provider: input.provider ?? null,
      p_raw_claims: claims,
    },
  };
}

export async function upsertOidcUserViaSupabase(
  input: SupabaseOidcSyncInput,
  env: Record<string, string | undefined> = process.env
): Promise<{ principalId: string; appUserId: string | null; skipped: boolean }> {
  const config = resolveSupabaseOidcSyncConfig(env);
  const { principalId, payload } = buildCompatOidcPayload(input);

  if (!config) {
    return {
      principalId,
      appUserId: null,
      skipped: true,
    };
  }

  const response = await fetch(
    `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/upsert_oidc_user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Failed to upsert OIDC user: ${response.status} ${response.statusText} ${text}`
    );
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const appUserId =
    typeof body.id === 'string'
      ? body.id
      : typeof body.appUserId === 'string'
      ? body.appUserId
      : null;

  return {
    principalId,
    appUserId,
    skipped: false,
  };
}
