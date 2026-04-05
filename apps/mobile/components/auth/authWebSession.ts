import {
  createAlternunAuthentikPreset,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  resolveAuthentikRedirectUri,
  type OidcSession,
} from '@alternun/auth';

export interface AuthTokenSessionPayload {
  access_token: string;
  refresh_token: string;
}

export interface SupabaseSetSessionResponse {
  error?: { message?: string } | null;
}

export interface SupabaseAuthShape {
  setSession?: (payload: AuthTokenSessionPayload) => Promise<SupabaseSetSessionResponse>;
}

export interface CallbackCapableAuthClient {
  supabase?: {
    auth?: SupabaseAuthShape;
  };
  setOidcUser?: (user: import('@alternun/auth').User | null) => void;
}

export const AUTH_CALLBACK_QUERY_KEYS = [
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'type',
  'error',
  'error_code',
  'error_description',
  'code',
] as const;

export const authentikPreset = createAlternunAuthentikPreset({
  issuer:
    resolveAuthentikIssuer(
      process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER,
      typeof window !== 'undefined' ? window.location.origin : undefined,
      resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID)
    ) ?? '',
  clientId: resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID),
  redirectUri:
    resolveAuthentikRedirectUri(
      process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI,
      typeof window !== 'undefined' ? window.location.origin : undefined
    ) ?? '',
});

export function oidcSessionToUser(
  session: OidcSession,
  supabaseUserId?: string
): import('@alternun/auth').User {
  return {
    id: supabaseUserId ?? session.claims.sub,
    email: session.claims.email,
    avatarUrl: session.claims.picture,
    provider: session.provider,
    metadata: {
      ...session.claims,
      name: session.claims.name,
      picture: session.claims.picture,
      emailVerified: session.claims.email_verified,
    },
  };
}

export function stripAuthCallbackTokensFromUrl(urlValue: string): void {
  const runtimeWindow = typeof window === 'undefined' ? undefined : window;

  try {
    const parsedUrl = new URL(urlValue);
    const searchParams = new URLSearchParams(parsedUrl.search);
    for (const key of AUTH_CALLBACK_QUERY_KEYS) {
      searchParams.delete(key);
    }

    const nextSearch = searchParams.toString();
    const nextPath = `${parsedUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    if (runtimeWindow?.history?.replaceState) {
      runtimeWindow.history.replaceState({}, '', nextPath);
    }
  } catch {
    const fallbackPathname = runtimeWindow?.location?.pathname;
    if (runtimeWindow?.history?.replaceState && fallbackPathname) {
      runtimeWindow.history.replaceState({}, '', fallbackPathname);
    }
  }
}
