export const AUTH_WEB_PASSWORD_RESET_ROUTE = '/auth/reset-password';
export const AUTH_WEB_SIGN_IN_ROUTE = '/auth';
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 45;

function normalizeRouteQueryValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildPasswordResetRoute(
  params: {
    next?: string | null;
    email?: string | null;
  } = {}
): string {
  const searchParams = new URLSearchParams();
  const next = normalizeRouteQueryValue(params.next);
  const email = normalizeRouteQueryValue(params.email);

  if (next) {
    searchParams.set('next', next);
  }

  if (email) {
    searchParams.set('email', email);
  }

  const query = searchParams.toString();
  return query ? `${AUTH_WEB_PASSWORD_RESET_ROUTE}?${query}` : AUTH_WEB_PASSWORD_RESET_ROUTE;
}

export function buildAuthSignInRoute(
  params: {
    next?: string | null;
  } = {}
): string {
  const searchParams = new URLSearchParams();
  const next = normalizeRouteQueryValue(params.next);

  if (next) {
    searchParams.set('next', next);
  }

  const query = searchParams.toString();
  return query ? `${AUTH_WEB_SIGN_IN_ROUTE}?${query}` : AUTH_WEB_SIGN_IN_ROUTE;
}

export function buildPasswordResetRedirectUrl(
  browserOrigin: string,
  params: {
    next?: string | null;
  } = {}
): string {
  const redirectUrl = new URL(AUTH_WEB_PASSWORD_RESET_ROUTE, browserOrigin);
  const next = normalizeRouteQueryValue(params.next);

  if (next) {
    redirectUrl.searchParams.set('next', next);
  }

  return redirectUrl.toString();
}

export interface PasswordResetResendLabels {
  sendLink: string;
  sendAgainIn: (seconds: number) => string;
}

export interface PasswordResetRecoveryClientLike {
  supabase?: {
    auth?: {
      setSession?: (payload: {
        access_token: string;
        refresh_token: string;
      }) => Promise<{ error?: { message?: string } | null }>;
      verifyOtp?: (payload: {
        type: 'recovery';
        email: string;
        token: string;
      }) => Promise<{ error?: { message?: string } | null }>;
    };
  };
}

export function isPasswordResetResendDisabled(resendCooldownSeconds: number): boolean {
  return resendCooldownSeconds > 0;
}

export function formatPasswordResetResendLabel(
  resendCooldownSeconds: number,
  labels: PasswordResetResendLabels
): string {
  if (resendCooldownSeconds > 0) {
    return labels.sendAgainIn(resendCooldownSeconds);
  }

  return labels.sendLink;
}

function normalizePasswordResetCode(code: string): string {
  const normalizedCode = code.trim().replace(/\s+/g, '');
  if (!normalizedCode) {
    throw new Error('Reset code is required.');
  }

  return normalizedCode;
}

function normalizePasswordResetEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email address.');
  }

  return normalizedEmail;
}

export async function verifyPasswordResetCode(
  client: PasswordResetRecoveryClientLike,
  email: string,
  code: string
): Promise<void> {
  let normalizedEmail: string;
  let normalizedCode: string;

  try {
    normalizedEmail = normalizePasswordResetEmail(email);
    normalizedCode = normalizePasswordResetCode(code);
  } catch {
    throw new Error('VALIDATION_ERROR: Enter a valid email address and reset code.');
  }

  const auth = client.supabase?.auth;
  if (!auth?.verifyOtp) {
    throw new Error(
      'CONFIG_ERROR: Supabase recovery code verification is not available in this client.'
    );
  }

  const result = await auth.verifyOtp({
    type: 'recovery',
    email: normalizedEmail,
    token: normalizedCode,
  });

  if (result?.error?.message) {
    throw new Error(result.error.message);
  }
}

export async function finalizePasswordResetRecoverySession(
  client: PasswordResetRecoveryClientLike,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const auth = client.supabase?.auth;
  if (!auth?.setSession) {
    throw new Error(
      'CONFIG_ERROR: Supabase recovery session finalization is not available in this client.'
    );
  }

  const result = await auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (result?.error?.message) {
    throw new Error(result.error.message);
  }
}

export function resolveAuthAppOrigin(
  env: Record<string, string | undefined> = process.env
): string | null {
  const explicitOrigin = env.EXPO_PUBLIC_ORIGIN?.trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, '');
  }

  return typeof window !== 'undefined' ? window.location?.origin ?? null : null;
}
