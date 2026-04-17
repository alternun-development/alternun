import {
  createAlternunAuthentikPreset,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  resolveAuthentikRedirectUri,
  upsertOidcUser,
  type OidcClaims,
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

function toOidcClaims(payload: LegacyProvisioningPayload,): OidcClaims {
  const rawClaims = payload.rawClaims ?? {};

  return {
    sub: payload.sub,
    iss: payload.iss,
    email: payload.email,
    email_verified: payload.emailVerified,
    name: payload.name ?? undefined,
    picture: payload.picture ?? undefined,
    ...rawClaims,
  };
}

export const authentikPreset = createAlternunAuthentikPreset({
  issuer:
    resolveAuthentikIssuer(
      process.env.EXPO_PUBLIC_AUTHENTIK_ISSUER,
      typeof window !== 'undefined' ? window.location.origin : undefined,
      resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID,),
    ) ?? '',
  clientId: resolveAuthentikClientId(process.env.EXPO_PUBLIC_AUTHENTIK_CLIENT_ID,),
  redirectUri:
    resolveAuthentikRedirectUri(
      process.env.EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI,
      typeof window !== 'undefined' ? window.location.origin : undefined,
    ) ?? '',
  provisioningAdapter: {
    async sync(payload: LegacyProvisioningPayload,): Promise<LegacyProvisioningResult> {
      try {
        const appUserId = await upsertOidcUser(toOidcClaims(payload,), payload.provider,);
        return { synced: true, appUserId, };
      } catch (err) {
        return {
          synced: false,
          error: err instanceof Error ? err.message : 'Provisioning failed',
        };
      }
    },
  } as LegacyProvisioningAdapter,
},);
