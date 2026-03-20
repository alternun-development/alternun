/**
 * Alternun Authentik → Supabase bridge.
 *
 * The full Authentik OIDC client (PKCE flow, token exchange, session storage)
 * now lives in `@edcalderon/auth`. This file provides only the Supabase side:
 * upserting the authenticated OIDC user into `public.users` via the
 * `upsert_oidc_user` SECURITY DEFINER RPC.
 */
import type { OidcClaims } from '@edcalderon/auth';

interface UpsertOidcUserResult {
  id: string;
}

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URI ?? '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

/**
 * Upserts an Authentik OIDC user into the Supabase `public.users` table
 * via the `upsert_oidc_user` SECURITY DEFINER RPC.
 * Returns the Supabase user UUID.
 */
export async function upsertOidcUser(claims: OidcClaims, provider?: string): Promise<string> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'CONFIG_ERROR: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY must be set.'
    );
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_oidc_user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      p_sub: claims.sub,
      p_iss: claims.iss ?? '',
      p_email: claims.email ?? null,
      p_email_verified: claims.email_verified ?? false,
      p_name: claims.name ?? null,
      p_picture: claims.picture ?? null,
      p_provider: provider ?? null,
      p_raw_claims: claims,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to upsert user: ${res.status} ${text}`);
  }

  const data = (await res.json()) as UpsertOidcUserResult;
  return data.id;
}
