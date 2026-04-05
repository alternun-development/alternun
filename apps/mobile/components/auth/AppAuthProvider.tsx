import {
  AppAuthProvider as AlternunAuthProvider,
  useAuth as useAlternunAuth,
} from '@alternun/auth';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { createTypographyStyles } from '../theme/typography';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { createWeb3WalletBridge } from './walletBridge';
import {
  clearOidcSession,
  createAlternunAuthentikPreset,
  handleAuthentikCallback,
  hasPendingAuthentikCallback,
  resolveAuthentikClientId,
  resolveAuthentikIssuer,
  readOidcSession,
  resolveAuthentikRedirectUri,
  type OidcSession,
  type OidcTokens,
} from '@alternun/auth';

// Capture window.location.search at module load time — before Expo Router's
// navigation events strip the query string from the URL on the callback render.
const INITIAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';

const authentikPreset = createAlternunAuthentikPreset({
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

function getAllowMockWalletFallback(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH === 'true';
}

function getAllowWalletOnlySession(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH === 'true';
}

function getSupabaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URI;
}

function getSupabaseKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

interface CallbackToast {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface AuthTokenSessionPayload {
  access_token: string;
  refresh_token: string;
}

interface SupabaseSetSessionResponse {
  error?: { message?: string } | null;
}

interface SupabaseAuthShape {
  setSession?: (payload: AuthTokenSessionPayload) => Promise<SupabaseSetSessionResponse>;
}

interface CallbackCapableAuthClient {
  supabase?: {
    auth?: SupabaseAuthShape;
  };
  setOidcUser?: (user: import('@alternun/auth').User | null) => void;
}

const AUTH_CALLBACK_QUERY_KEYS = [
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
];

function resolveCallbackSuccessToast(
  typeValue: string | null,
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string
): CallbackToast {
  const normalizedType = (typeValue ?? '').toLowerCase().trim();

  if (normalizedType === 'signup') {
    return {
      type: 'success',
      title: t('authCallback.success.signup.title'),
      message: t('authCallback.success.signup.message'),
    };
  }

  if (normalizedType === 'recovery') {
    return {
      type: 'info',
      title: t('authCallback.success.recovery.title'),
      message: t('authCallback.success.recovery.message'),
    };
  }

  return {
    type: 'success',
    title: t('authCallback.success.default.title'),
    message: t('authCallback.success.default.message'),
  };
}

function stripAuthCallbackTokensFromUrl(urlValue: string): void {
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

function oidcSessionToUser(
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

function AuthCallbackBridge(): React.JSX.Element | null {
  const { client } = useAlternunAuth();
  const { t } = useAppTranslation('mobile');
  const [toast, setToast] = useState<CallbackToast | null>(null);

  // Restore stored OIDC session on mount (survives page reload)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const session = readOidcSession();
    if (!session) return;
    const callbackClient = client as CallbackCapableAuthClient;
    // Re-provision on restore to ensure Supabase UUID is current; fall back to sub.
    void authentikPreset
      .onSessionReady(session.claims, session.provider)
      .then((appUserId) => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session, appUserId));
      })
      .catch(() => {
        callbackClient.setOidcUser?.(oidcSessionToUser(session));
      });
  }, [client]);

  // Clear OIDC session and revoke token when user signs out
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    return client.onAuthStateChange((user) => {
      if (!user) {
        const session = readOidcSession();
        clearOidcSession();
        if (session?.tokens.accessToken ?? session?.tokens.idToken) {
          void authentikPreset
            .logoutHandler({
              accessToken: session.tokens.accessToken,
              idToken: session.tokens.idToken,
            })
            .then((result: { endSessionUrl?: string }) => {
              if (typeof window !== 'undefined' && result.endSessionUrl) {
                window.location.assign(result.endSessionUrl);
              }
            })
            .catch(() => {
              // Best-effort token revocation — local session already cleared
            });
        }
      }
    });
  }, [client]);

  // Handle Authentik OIDC redirect callback (?code=...&state=...)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const runtimeWindow = typeof window === 'undefined' ? undefined : window;
    const savedSearch =
      INITIAL_SEARCH.length > 0 ? INITIAL_SEARCH : runtimeWindow?.location?.search ?? '';
    if (!hasPendingAuthentikCallback(savedSearch)) return;

    if (runtimeWindow?.history?.replaceState) {
      runtimeWindow.history.replaceState({}, '', runtimeWindow.location.pathname);
    }

    let cancelled = false;
    let supabaseUserId: string | undefined;
    void handleAuthentikCallback(savedSearch, {
      onSessionReady: async (_claims, _tokens: OidcTokens, session: OidcSession) => {
        supabaseUserId = await authentikPreset.onSessionReady(session.claims, session.provider);
      },
    })
      .then((session) => {
        if (cancelled) return;
        const callbackClient = client as CallbackCapableAuthClient;
        callbackClient.setOidcUser?.(oidcSessionToUser(session, supabaseUserId));
        setToast({
          type: 'success',
          title: t('authCallback.success.default.title'),
          message: t('authCallback.success.default.message'),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setToast({
          type: 'error',
          title: t('authCallback.errors.title'),
          message: err instanceof Error ? err.message : t('authCallback.errors.finalizeFailed'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [client, t]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const runtimeWindow = typeof window === 'undefined' ? undefined : window;
    if (!runtimeWindow) {
      return;
    }

    const hashValue = runtimeWindow.location.hash?.startsWith('#')
      ? runtimeWindow.location.hash.slice(1)
      : runtimeWindow.location.hash ?? '';
    const hashParams = new URLSearchParams(hashValue);
    const queryParams = new URLSearchParams(runtimeWindow.location.search ?? '');
    const readParam = (key: string): string | null => hashParams.get(key) ?? queryParams.get(key);

    const accessToken = readParam('access_token');
    const refreshToken = readParam('refresh_token');
    const callbackType = readParam('type');
    const callbackError = readParam('error');
    const callbackErrorDescription = readParam('error_description');
    const callbackErrorCode = readParam('error_code');

    const hasCallbackPayload = [
      accessToken,
      refreshToken,
      callbackType,
      callbackError,
      callbackErrorDescription,
      callbackErrorCode,
    ].some((value) => Boolean((value?.length ?? 0) > 0));

    if (!hasCallbackPayload) {
      return;
    }

    // Always scrub callback tokens from the URL immediately.
    stripAuthCallbackTokensFromUrl(runtimeWindow.location.href);

    const hasCallbackError = [callbackError, callbackErrorDescription, callbackErrorCode].some(
      (value) => Boolean((value?.length ?? 0) > 0)
    );

    if (hasCallbackError) {
      const errorMessage =
        callbackErrorDescription ??
        callbackError ??
        callbackErrorCode ??
        t('authCallback.errors.failed');
      setToast({
        type: 'error',
        title: t('authCallback.errors.title'),
        message: errorMessage,
      });
      return;
    }

    if (!accessToken || !refreshToken) {
      setToast({
        type: 'error',
        title: t('authCallback.errors.title'),
        message: t('authCallback.errors.missingSession'),
      });
      return;
    }

    const callbackClient = client as CallbackCapableAuthClient;
    const authModule = callbackClient.supabase?.auth;

    if (!authModule || typeof authModule.setSession !== 'function') {
      setToast({
        type: 'error',
        title: t('authCallback.errors.title'),
        message: t('authCallback.errors.unsupportedClient'),
      });
      return;
    }

    let cancelled = false;
    void authModule
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.error?.message) {
          setToast({
            type: 'error',
            title: t('authCallback.errors.title'),
            message: result.error.message,
          });
          return;
        }

        setToast(resolveCallbackSuccessToast(callbackType, t));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setToast({
          type: 'error',
          title: t('authCallback.errors.title'),
          message: error instanceof Error ? error.message : t('authCallback.errors.finalizeFailed'),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [client, t]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast(null);
    }, 5500);

    return () => clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents='box-none' style={styles.toastContainer}>
      <Pressable
        onPress={() => {
          setToast(null);
        }}
        style={[
          styles.toastCard,
          toast.type === 'error'
            ? styles.toastCardError
            : toast.type === 'info'
            ? styles.toastCardInfo
            : styles.toastCardSuccess,
        ]}
      >
        <Text style={styles.toastTitle}>{toast.title}</Text>
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </Pressable>
    </View>
  );
}

export function AppAuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), []);

  return (
    <AlternunAuthProvider
      options={{
        supabaseUrl: getSupabaseUrl(),
        supabaseKey: getSupabaseKey(),
        walletBridge,
        allowMockWalletFallback: getAllowMockWalletFallback(),
        allowWalletOnlySession: getAllowWalletOnlySession(),
      }}
    >
      {children}
      <AuthCallbackBridge />
    </AlternunAuthProvider>
  );
}

export const useAuth = useAlternunAuth;

const styles = createTypographyStyles({
  toastContainer: {
    position: 'absolute',
    top: 18,
    left: 14,
    right: 14,
    zIndex: 1200,
  },
  toastCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 12,
  },
  toastCardSuccess: {
    backgroundColor: 'rgba(5, 32, 24, 0.92)',
    borderColor: 'rgba(29, 203, 161, 0.5)',
  },
  toastCardError: {
    backgroundColor: 'rgba(48, 11, 20, 0.92)',
    borderColor: 'rgba(248, 113, 113, 0.48)',
  },
  toastCardInfo: {
    backgroundColor: 'rgba(16, 24, 39, 0.92)',
    borderColor: 'rgba(125, 211, 252, 0.44)',
  },
  toastTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  toastMessage: {
    color: 'rgba(248, 250, 252, 0.84)',
    fontSize: 12,
    lineHeight: 16,
  },
});
export type { OAuthFlow, User } from '@alternun/auth';
