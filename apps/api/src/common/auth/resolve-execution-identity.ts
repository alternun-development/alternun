import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { resolveGetSessionUrl } from './resolve-user-id';

const IDENTITY_VERIFICATION_TIMEOUT_MS = 5_000;

export interface ResolvedExecutionIdentity {
  source: 'better-auth' | 'supabase';
  subject: string;
  provider: string;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
}

type VerificationOutcome =
  | { status: 'verified'; identity: ResolvedExecutionIdentity }
  | { status: 'invalid' }
  | { status: 'unavailable' }
  | { status: 'not-configured' };

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeExecutionEmail(value: unknown): string | null {
  return nonEmptyString(value)?.toLowerCase() ?? null;
}

export function normalizeExecutionProvider(value: unknown): string | null {
  const provider = nonEmptyString(value)?.toLowerCase() ?? null;
  return provider === 'supabase' ? 'email' : provider;
}

function bearerToken(authorization?: string): string | null {
  const match = authorization?.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function verificationSignal(): AbortSignal {
  return AbortSignal.timeout(IDENTITY_VERIFICATION_TIMEOUT_MS);
}

function betterAuthHeaders(authorization?: string, cookie?: string): Record<string, string> {
  return {
    ...(authorization?.trim() ? { Authorization: authorization.trim() } : {}),
    ...(cookie?.trim() ? { Cookie: cookie.trim() } : {}),
  };
}

export async function resolveBetterAuthExecutionIdentity(
  authorization: string | undefined,
  cookie: string | undefined,
  env: Record<string, string | undefined> = process.env
): Promise<VerificationOutcome> {
  const url = resolveGetSessionUrl(env);
  if (!url) {
    return { status: 'not-configured' };
  }

  try {
    const response = await fetch(url, {
      headers: betterAuthHeaders(authorization, cookie),
      signal: verificationSignal(),
    });

    if (!response.ok) {
      return response.status >= 500 ? { status: 'unavailable' } : { status: 'invalid' };
    }

    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const payload =
      raw?.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw;
    const user =
      payload?.user && typeof payload.user === 'object'
        ? (payload.user as Record<string, unknown>)
        : null;
    const session =
      payload?.session && typeof payload.session === 'object'
        ? (payload.session as Record<string, unknown>)
        : null;
    const userId = nonEmptyString(user?.id);
    const sessionUserId = nonEmptyString(session?.userId);
    const email = normalizeExecutionEmail(user?.email);
    const expiresAt = nonEmptyString(session?.expiresAt);

    if (!session || !userId || !email || (sessionUserId && sessionUserId !== userId)) {
      return { status: 'invalid' };
    }

    if (expiresAt) {
      const expiresAtMs = Date.parse(expiresAt);
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        return { status: 'invalid' };
      }
    }

    return {
      status: 'verified',
      identity: {
        source: 'better-auth',
        subject: userId,
        provider: 'better-auth',
        providerUserId: userId,
        email,
        emailVerified: user?.emailVerified === true,
      },
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function resolveSupabaseExecutionIdentity(
  token: string,
  env: Record<string, string | undefined> = process.env
): Promise<VerificationOutcome> {
  const supabaseUrl = nonEmptyString(env.SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL);
  const apiKey = nonEmptyString(
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_KEY
  );
  if (!supabaseUrl || !apiKey) {
    return { status: 'not-configured' };
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
      signal: verificationSignal(),
    });

    if (!response.ok) {
      return response.status >= 500 ? { status: 'unavailable' } : { status: 'invalid' };
    }

    const user = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const subject = nonEmptyString(user?.id);
    const email = normalizeExecutionEmail(user?.email);
    const identities = Array.isArray(user?.identities)
      ? user.identities.filter((entry): entry is Record<string, unknown> =>
          Boolean(entry && typeof entry === 'object')
        )
      : [];
    const appMetadata =
      user?.app_metadata && typeof user.app_metadata === 'object'
        ? (user.app_metadata as Record<string, unknown>)
        : null;
    const declaredProvider = normalizeExecutionProvider(appMetadata?.provider);
    const identity =
      identities.find((entry) => normalizeExecutionProvider(entry.provider) === declaredProvider) ??
      (identities.length === 1
        ? identities[0]
        : identities.find((entry) => normalizeExecutionProvider(entry.provider) === 'email'));
    const provider = normalizeExecutionProvider(identity?.provider ?? declaredProvider);

    if (!subject || !email || !identity || !provider) {
      return { status: 'unavailable' };
    }

    const providerUserId =
      provider === 'email'
        ? subject
        : nonEmptyString(identity.id) ?? nonEmptyString(identity.user_id);
    if (!providerUserId) {
      return { status: 'unavailable' };
    }

    return {
      status: 'verified',
      identity: {
        source: 'supabase',
        subject,
        provider,
        providerUserId,
        email,
        emailVerified: Boolean(
          nonEmptyString(user?.email_confirmed_at) ?? nonEmptyString(user?.confirmed_at)
        ),
      },
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function resolveExecutionIdentity(
  authorization?: string,
  cookie?: string,
  env: Record<string, string | undefined> = process.env
): Promise<ResolvedExecutionIdentity> {
  const token = bearerToken(authorization);
  const normalizedCookie = nonEmptyString(cookie);
  if (!token && !normalizedCookie) {
    throw new UnauthorizedException('A verified execution session is required.');
  }

  const outcomes: VerificationOutcome[] = [];
  outcomes.push(
    await resolveBetterAuthExecutionIdentity(authorization, normalizedCookie ?? undefined, env)
  );
  if (token) {
    outcomes.push(await resolveSupabaseExecutionIdentity(token, env));
  }

  const verifiedOutcomes = outcomes.filter(
    (outcome): outcome is Extract<VerificationOutcome, { status: 'verified' }> =>
      outcome.status === 'verified'
  );
  if (verifiedOutcomes.length > 1) {
    throw new UnauthorizedException('Conflicting execution sessions were provided.');
  }
  if (verifiedOutcomes[0]) {
    return verifiedOutcomes[0].identity;
  }

  if (
    outcomes.some((outcome) => outcome.status === 'unavailable') ||
    outcomes.every((outcome) => outcome.status === 'not-configured')
  ) {
    throw new ServiceUnavailableException('Execution session verification is unavailable.');
  }

  throw new UnauthorizedException('Invalid or expired execution session.');
}
