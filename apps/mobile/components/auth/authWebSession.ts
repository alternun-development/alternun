import {
  createAlternunAuthentikPreset,
  resolveAuthRuntimeConfig,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  resolveAuthentikRedirectUri,
} from '@alternun/auth';
export {
  clearPendingAuthentikOAuthProvider,
  oidcSessionToUser,
  readPendingAuthentikOAuthProvider,
  readWebAuthCallbackPayload,
  resumePendingSocialSignIn,
  startSocialSignIn,
  stripAuthCallbackTokensFromUrl,
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
  getUser?: () => Promise<import('@alternun/auth').User | null>;
  setOidcUser?: (user: import('@alternun/auth').User | null) => void;
}

interface LegacyProvisioningPayload {
  sub: string;
  iss: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  provider?: string;
  rawClaims?: Record<string, unknown>;
}

interface LegacyProvisioningResult {
  synced: boolean;
  appUserId?: string;
  error?: string;
}

interface LegacyProvisioningAdapter {
  sync(payload: LegacyProvisioningPayload): Promise<LegacyProvisioningResult>;
}

interface BackendProvisioningResponse {
  appUserId?: string | null;
  syncStatus?: string | null;
}

async function provisionAuthentikUserThroughApi(
  payload: LegacyProvisioningPayload
): Promise<LegacyProvisioningResult> {
  const authExchangeUrl = resolveAuthRuntimeConfig().authExchangeUrl;
  if (!authExchangeUrl) {
    throw new Error('Auth exchange URL is not configured for Authentik provisioning.');
  }

  const response = await fetch(authExchangeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      externalIdentity: {
        provider: payload.provider ?? 'authentik',
        providerUserId: payload.sub,
        email: payload.email,
        emailVerified: payload.emailVerified,
        displayName: payload.name,
        avatarUrl: payload.picture,
        rawClaims: payload.rawClaims ?? {},
      },
      context: {
        trigger: 'authentik-callback',
        runtime: 'mobile',
        app: 'alternun-mobile',
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Auth backend provisioning failed (${response.status} ${response.statusText}): ${text}`
    );
  }

  const result = (await response.json()) as BackendProvisioningResponse;
  if (result.syncStatus !== 'synced' || !result.appUserId) {
    throw new Error('Auth backend did not confirm Authentik user provisioning.');
  }

  return {
    synced: true,
    appUserId: result.appUserId,
  };
}

export const authentikPreset = createAlternunAuthentikPreset({
  issuer:
    resolveAuthentikIssuer(
      process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER,
      typeof window !== 'undefined' ? window.location?.origin : undefined,
      resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID)
    ) ?? '',
  clientId: resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID),
  redirectUri:
    resolveAuthentikRedirectUri(
      process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI,
      typeof window !== 'undefined' ? window.location?.origin : undefined
    ) ?? '',
  provisioningAdapter: {
    async sync(payload: LegacyProvisioningPayload): Promise<LegacyProvisioningResult> {
      try {
        return await provisionAuthentikUserThroughApi(payload);
      } catch (err) {
        return {
          synced: false,
          error: err instanceof Error ? err.message : 'Provisioning failed',
        };
      }
    },
  } as LegacyProvisioningAdapter,
});
