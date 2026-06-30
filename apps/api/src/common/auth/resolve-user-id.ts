import { UnauthorizedException } from '@nestjs/common';
import { verifyIssuerJwt } from '../../modules/auth-exchange/auth-exchange-jwt';

// Shared bearer-token -> app user id resolution, used by every module that needs to identify the
// requesting user (AIRS, wallet, ...). Extracted from apps/api/src/modules/airs/airs.service.ts to
// avoid two independently-maintained copies of security-sensitive token verification drifting apart.

function normalizeToken(token: string): string {
  const trimmed = token.trim();
  return trimmed.startsWith('Bearer ') ? trimmed.slice('Bearer '.length).trim() : trimmed;
}

export function resolveGetSessionUrl(env: Record<string, string | undefined>): string | null {
  const candidates = [env.AUTH_BETTER_AUTH_URL, env.BETTER_AUTH_URL];
  const raw = (candidates.find((v) => v?.trim()) ?? '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  // Some environments omit the /auth segment (e.g. testnet sets the API origin only).
  const withAuth = raw.endsWith('/auth') ? raw : `${raw}/auth`;
  return `${withAuth}/get-session`;
}

async function resolveUserIdFromSupabaseJwt(
  token: string,
  env: Record<string, string | undefined>
): Promise<string | null> {
  const supabaseUrl = (env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceRoleKey,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return typeof data?.id === 'string' ? data.id : null;
  } catch {
    return null;
  }
}

async function resolveUserIdFromBetterAuthSession(
  token: string,
  env: Record<string, string | undefined>
): Promise<string> {
  const url = resolveGetSessionUrl(env);
  if (!url) throw new UnauthorizedException('Invalid or expired session token');

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json().catch(() => null)) as { user?: { id?: string } } | null;
    const userId = typeof data?.user?.id === 'string' ? data.user.id : '';
    if (!userId) throw new UnauthorizedException('Invalid or expired session token');
    return userId;
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException('Invalid or expired session token');
  }
}

export async function resolveUserId(
  token: string,
  env: Record<string, string | undefined> = process.env
): Promise<string> {
  const normalized = normalizeToken(token);

  const signingKey = (
    env.AUTHENTIK_JWT_SIGNING_KEY ??
    env.AUTHENTIK_JWT_SIGNING_SECRET ??
    env.AUTH_SESSION_SIGNING_KEY ??
    ''
  ).trim();

  if (signingKey) {
    try {
      const verified = verifyIssuerJwt(normalized, signingKey);
      const userId =
        typeof verified.claims.app_user_id === 'string' ? verified.claims.app_user_id : '';
      if (userId) return userId;
    } catch {
      // fall through to Better Auth session lookup
    }
  }

  // Fallback 1: verify as Supabase JWT (production path when AUTH_EXECUTION_PROVIDER=supabase)
  const supabaseUserId = await resolveUserIdFromSupabaseJwt(normalized, env);
  if (supabaseUserId) return supabaseUserId;

  // Fallback 2: verify via Better Auth /get-session (dev path)
  return resolveUserIdFromBetterAuthSession(normalized, env);
}
