import {
  AppAuthProvider as AlternunAuthProvider,
  useAuth as useAlternunAuth,
} from '@alternun/auth';
import { useEffect, useMemo, useState, type PropsWithChildren, } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { useAppTranslation, } from '../i18n/useAppTranslation';
import { createWeb3WalletBridge, } from './walletBridge';

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
  setSession?: (
    payload: AuthTokenSessionPayload,
  ) => Promise<SupabaseSetSessionResponse>;
}

interface CallbackCapableAuthClient {
  supabase?: {
    auth?: SupabaseAuthShape;
  };
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
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string,
): CallbackToast {
  const normalizedType = (typeValue ?? '').toLowerCase().trim();

  if (normalizedType === 'signup') {
    return {
      type: 'success',
      title: t('authCallback.success.signup.title',),
      message: t('authCallback.success.signup.message',),
    };
  }

  if (normalizedType === 'recovery') {
    return {
      type: 'info',
      title: t('authCallback.success.recovery.title',),
      message: t('authCallback.success.recovery.message',),
    };
  }

  return {
    type: 'success',
    title: t('authCallback.success.default.title',),
    message: t('authCallback.success.default.message',),
  };
}

function stripAuthCallbackTokensFromUrl(urlValue: string,): void {
  const runtimeWindow = typeof window === 'undefined' ? undefined : window;

  try {
    const parsedUrl = new URL(urlValue,);
    const searchParams = new URLSearchParams(parsedUrl.search,);
    for (const key of AUTH_CALLBACK_QUERY_KEYS) {
      searchParams.delete(key,);
    }

    const nextSearch = searchParams.toString();
    const nextPath = `${parsedUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
    if (runtimeWindow?.history?.replaceState) {
      runtimeWindow.history.replaceState({}, '', nextPath,);
    }
  } catch {
    const fallbackPathname = runtimeWindow?.location?.pathname;
    if (runtimeWindow?.history?.replaceState && fallbackPathname) {
      runtimeWindow.history.replaceState({}, '', fallbackPathname,);
    }
  }
}

function AuthCallbackBridge(): React.JSX.Element | null {
  const { client, } = useAlternunAuth();
  const { t, } = useAppTranslation('mobile',);
  const [toast, setToast,] = useState<CallbackToast | null>(null,);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const runtimeWindow = typeof window === 'undefined' ? undefined : window;
    if (!runtimeWindow) {
      return;
    }

    const hashValue = runtimeWindow.location.hash?.startsWith('#',)
      ? runtimeWindow.location.hash.slice(1,)
      : runtimeWindow.location.hash ?? '';
    const hashParams = new URLSearchParams(hashValue,);
    const queryParams = new URLSearchParams(runtimeWindow.location.search ?? '',);
    const readParam = (key: string,): string | null =>
      hashParams.get(key,) ?? queryParams.get(key,);

    const accessToken = readParam('access_token',);
    const refreshToken = readParam('refresh_token',);
    const callbackType = readParam('type',);
    const callbackError = readParam('error',);
    const callbackErrorDescription = readParam('error_description',);
    const callbackErrorCode = readParam('error_code',);

    const hasCallbackPayload = [
      accessToken,
      refreshToken,
      callbackType,
      callbackError,
      callbackErrorDescription,
      callbackErrorCode,
    ].some((value,) => Boolean((value?.length ?? 0) > 0,),);

    if (!hasCallbackPayload) {
      return;
    }

    // Always scrub callback tokens from the URL immediately.
    stripAuthCallbackTokensFromUrl(runtimeWindow.location.href,);

    const hasCallbackError = [
      callbackError,
      callbackErrorDescription,
      callbackErrorCode,
    ].some((value,) => Boolean((value?.length ?? 0) > 0,),);

    if (hasCallbackError) {
      const errorMessage =
        callbackErrorDescription ??
        callbackError ??
        callbackErrorCode ??
        t('authCallback.errors.failed',);
      setToast({
        type: 'error',
        title: t('authCallback.errors.title',),
        message: errorMessage,
      },);
      return;
    }

    if (!accessToken || !refreshToken) {
      setToast({
        type: 'error',
        title: t('authCallback.errors.title',),
        message: t('authCallback.errors.missingSession',),
      },);
      return;
    }

    const callbackClient = client as CallbackCapableAuthClient;
    const setSession = callbackClient.supabase?.auth?.setSession;

    if (typeof setSession !== 'function') {
      setToast({
        type: 'error',
        title: t('authCallback.errors.title',),
        message: t('authCallback.errors.unsupportedClient',),
      },);
      return;
    }

    let cancelled = false;
    void setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    },)
      .then((result,) => {
        if (cancelled) {
          return;
        }

        if (result.error?.message) {
          setToast({
            type: 'error',
            title: t('authCallback.errors.title',),
            message: result.error.message,
          },);
          return;
        }

        setToast(resolveCallbackSuccessToast(callbackType, t,),);
      },)
      .catch((error: unknown,) => {
        if (cancelled) {
          return;
        }

        setToast({
          type: 'error',
          title: t('authCallback.errors.title',),
          message:
            error instanceof Error
              ? error.message
              : t('authCallback.errors.finalizeFailed',),
        },);
      },);

    return () => {
      cancelled = true;
    };
  }, [client, t,],);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast(null,);
    }, 5500,);

    return () => clearTimeout(timeout,);
  }, [toast,],);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents='box-none' style={styles.toastContainer}>
      <Pressable
        onPress={() => {
          setToast(null,);
        }}
        style={[
          styles.toastCard,
          toast.type === 'error' ? styles.toastCardError : toast.type === 'info' ? styles.toastCardInfo : styles.toastCardSuccess,
        ]}
      >
        <Text style={styles.toastTitle}>{toast.title}</Text>
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </Pressable>
    </View>
  );
}

export function AppAuthProvider({ children, }: PropsWithChildren,): React.JSX.Element {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), [],);

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
    shadowOffset: { width: 0, height: 6, },
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
},);
export type { OAuthFlow, User, } from '@alternun/auth';
