import { sql } from 'drizzle-orm';
import { getDatabase } from '../../../../common/database/connection';
import type { SignupProviderName, SignupUserRecord } from './signup.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function firstNonEmptyTrimmed(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

export function deriveSignupName(email: string, providedName?: string): string {
  const trimmedName = providedName?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const localPart = email.split('@')[0]?.trim();
  if (localPart) {
    return localPart;
  }

  return email.trim();
}

export function resolveVerificationCallbackUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicitUrl = env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI ?? env.AUTHENTIK_REDIRECT_URI;
  if (explicitUrl?.trim()) {
    return explicitUrl.trim().replace(/\/+$/, '');
  }

  const baseUrl =
    env.EXPO_PUBLIC_BETTER_AUTH_URL ?? env.AUTH_BETTER_AUTH_URL ?? env.BETTER_AUTH_URL;
  if (baseUrl?.trim()) {
    try {
      const url = new URL(baseUrl.trim().replace(/\/+$/, ''));
      const hostnameParts = url.hostname.split('.');
      const apiIndex = hostnameParts.indexOf('api');
      if (apiIndex >= 0) {
        hostnameParts[apiIndex] = 'airs';
        url.hostname = hostnameParts.join('.');
      }
      url.pathname = '/auth/callback';
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/+$/, '');
    } catch {
      return baseUrl.trim().replace(/\/+$/, '');
    }
  }

  return 'https://testnet.airs.alternun.co/auth/callback';
}

export function resolveSignupProviderName(
  env: NodeJS.ProcessEnv = process.env
): SignupProviderName {
  const selection = firstNonEmptyTrimmed([env.AUTH_SIGNUP_PROVIDER])?.toLowerCase();

  if (selection === 'better-auth' || selection === 'supabase' || selection === 'authentik') {
    return selection;
  }

  return 'supabase';
}

export function resolveSupabaseSignupConfig(
  env: NodeJS.ProcessEnv = process.env
): { url: string; key: string } | null {
  const url = firstNonEmptyTrimmed([env.SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_URL]);
  const key = firstNonEmptyTrimmed([
    env.SUPABASE_ANON_KEY,
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    env.EXPO_PUBLIC_SUPABASE_KEY,
    env.SUPABASE_KEY,
    env.SUPABASE_SERVICE_ROLE_KEY,
  ]);

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ''),
    key,
  };
}

export function resolveBetterAuthBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = firstNonEmptyTrimmed([
    env.AUTH_BETTER_AUTH_URL,
    env.BETTER_AUTH_URL,
    env.EXPO_PUBLIC_BETTER_AUTH_URL,
  ]);

  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, '');
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isRecord(error)) {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (isRecord(error.error) && typeof error.error.message === 'string') {
      return error.error.message;
    }
  }

  return 'Unable to create account. Please try again.';
}

export function extractErrorStatus(error: unknown): number | null {
  if (isRecord(error) && typeof error.status === 'number' && Number.isFinite(error.status)) {
    return error.status;
  }

  return null;
}

export function isDuplicateErrorPayload(value: unknown, seen = new Set<unknown>()): boolean {
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return false;
  }

  seen.add(value);

  if (isRecord(value)) {
    if (value.code === '23505') {
      return true;
    }

    if (typeof value.constraint === 'string' && value.constraint.toLowerCase().includes('email')) {
      return true;
    }

    if (typeof value.detail === 'string') {
      const detail = value.detail.toLowerCase();
      if (
        detail.includes('duplicate key value violates unique constraint') ||
        detail.includes('already exists') ||
        detail.includes('duplicate')
      ) {
        return true;
      }
    }

    if (typeof value.message === 'string') {
      const message = value.message.toLowerCase();
      if (
        message.includes('already registered') ||
        message.includes('already exists') ||
        message.includes('duplicate') ||
        message.includes('exists')
      ) {
        return true;
      }
    }
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    if (isDuplicateErrorPayload(nestedValue, seen)) {
      return true;
    }
  }

  return false;
}

export function isDuplicateSignupError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  const status = extractErrorStatus(error);

  return (
    isDuplicateErrorPayload(error) ||
    status === 409 ||
    message.includes('already registered') ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('exists')
  );
}

export function normalizeSignupUser(user: SignupUserRecord): Record<string, unknown> {
  const metadata = user.user_metadata ?? user.raw_user_meta_data ?? {};
  const appMetadata = user.app_metadata ?? user.raw_app_meta_data ?? {};
  const name =
    typeof metadata.name === 'string'
      ? metadata.name
      : typeof metadata.full_name === 'string'
      ? metadata.full_name
      : user.email.split('@')[0] ?? user.email;

  return {
    id: user.id,
    createdAt: user.created_at ?? new Date().toISOString(),
    updatedAt: user.updated_at ?? user.created_at ?? new Date().toISOString(),
    email: user.email,
    emailVerified: user.email_confirmed_at != null,
    name,
    ...(typeof metadata.avatar_url === 'string' ? { image: metadata.avatar_url } : {}),
    ...(typeof metadata.picture === 'string' ? { picture: metadata.picture } : {}),
    ...(Object.keys(appMetadata).length > 0 ? { appMetadata } : {}),
  };
}

export async function hasUnverifiedAuthUserByEmail(email: string): Promise<boolean> {
  const db = getDatabase();
  const result = await db.execute(sql`
    select email_confirmed_at
    from auth.users
    where email = ${email}
    limit 1
  `);

  const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? [];
  const row = rows[0];
  return row != null && row.email_confirmed_at == null;
}
