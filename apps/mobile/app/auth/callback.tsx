import {
  clearAuthReturnTo,
  clearOidcSession,
  finalizeSupabaseCallbackSession,
  handleAuthentikCallback,
  hasPendingAuthentikCallback,
  readAuthReturnTo,
  resolveAuthReturnTo,
  readWebAuthCallbackPayload,
  type OidcSession,
  type OidcTokens,
} from '@alternun/auth';
import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTranslation } from '../../components/i18n/useAppTranslation';
import { useAuth } from '../../components/auth/AppAuthProvider';
import { isBetterAuthExecutionEnabled } from '../../components/auth/authExecutionMode';
import {
  buildWebAuthCallbackRedirectPath,
  resolveAuthCallbackSuccessVariant,
} from '../../components/auth/authCallbackFlow';
import {
  authentikPreset,
  oidcSessionToUser,
  stripAuthCallbackTokensFromUrl,
  type CallbackCapableAuthClient,
} from '../../components/auth/authWebSession';
import { ToastSystem, type ToastItem } from '@alternun/ui';

const INITIAL_CALLBACK_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
const INITIAL_CALLBACK_HASH = typeof window !== 'undefined' ? window.location.hash : '';

type AuthCallbackHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

export default function AuthCallbackRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { client } = useAuth();
  const { t } = useAppTranslation('mobile');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const hasHandledRef = useRef(false);
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const callbackPayload = useMemo(() => {
    return readWebAuthCallbackPayload(INITIAL_CALLBACK_SEARCH, INITIAL_CALLBACK_HASH);
  }, []);
  const recoveryRedirectPath = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return buildWebAuthCallbackRedirectPath(INITIAL_CALLBACK_SEARCH, INITIAL_CALLBACK_HASH);
  }, []);
  const successVariant = useMemo(() => {
    return resolveAuthCallbackSuccessVariant(callbackPayload.callbackType);
  }, [callbackPayload.callbackType]);
  const successCopy = useMemo(() => {
    switch (successVariant) {
      case 'signup':
        return {
          title: t('authCallback.success.signup.title', undefined, 'Email Confirmed'),
          message: t(
            'authCallback.success.signup.message',
            undefined,
            'Your email was confirmed successfully. You are now signed in.'
          ),
        };
      case 'recovery':
        return {
          title: t('authCallback.success.recovery.title', undefined, 'Recovery Session Ready'),
          message: t(
            'authCallback.success.recovery.message',
            undefined,
            'Authentication callback completed for password recovery.'
          ),
        };
      default:
        return {
          title: t('authCallback.success.default.title', undefined, 'Signed In'),
          message: t(
            'authCallback.success.default.message',
            undefined,
            'Authentication callback completed successfully.'
          ),
        };
    }
  }, [successVariant, t]);

  const dismissToast = (id: string): void => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const pushToast = (title: string, message: string): void => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, title, message }]);
    setTimeout(() => dismissToast(id), 4000);
  };

  const redirectTarget = useMemo(() => {
    return resolveAuthReturnTo(readSearchParam(next) ?? readAuthReturnTo());
  }, [next]);

  useEffect(() => {
    if (!isNavigationReady || hasHandledRef.current || typeof window === 'undefined') {
      return;
    }

    hasHandledRef.current = true;

    const callbackClient = client as CallbackCapableAuthClient;
    const finishRedirect = (): void => {
      clearAuthReturnTo();
      router.replace(redirectTarget as AuthCallbackHref);
    };

    if (recoveryRedirectPath?.startsWith('/auth/reset-password')) {
      window.location.replace(recoveryRedirectPath);
      return;
    }

    if (isBetterAuthExecution) {
      clearOidcSession();
      void Promise.resolve(
        typeof callbackClient.getUser === 'function' ? callbackClient.getUser() : null
      )
        .catch(() => undefined)
        .then(() => {
          finishRedirect();
        });
      return;
    }

    if (hasPendingAuthentikCallback(INITIAL_CALLBACK_SEARCH)) {
      let supabaseUserId: string | undefined;

      void handleAuthentikCallback(INITIAL_CALLBACK_SEARCH, {
        onSessionReady: async (_claims, _tokens: OidcTokens, session: OidcSession) => {
          supabaseUserId = await authentikPreset.onSessionReady(session.claims, session.provider);
        },
      })
        .then((session) => {
          callbackClient.setOidcUser?.(oidcSessionToUser(session, supabaseUserId));
          finishRedirect();
        })
        .catch((error: unknown) => {
          setErrorMessage(
            error instanceof Error ? error.message : t('authCallback.errors.finalizeFailed')
          );
        });
      return;
    }

    if (!callbackPayload.hasPayload) {
      finishRedirect();
      return;
    }

    stripAuthCallbackTokensFromUrl(window.location.href);

    const callbackError =
      callbackPayload.callbackErrorDescription ??
      callbackPayload.callbackError ??
      callbackPayload.callbackErrorCode;
    if (callbackError) {
      setErrorMessage(callbackError);
      return;
    }

    if (!callbackPayload.accessToken || !callbackPayload.refreshToken) {
      setErrorMessage(t('authCallback.errors.missingSession'));
      return;
    }

    void finalizeSupabaseCallbackSession(callbackClient, {
      accessToken: callbackPayload.accessToken,
      refreshToken: callbackPayload.refreshToken,
    })
      .then(() => {
        setSuccessMessage(successCopy.message);
        pushToast(successCopy.title, successCopy.message);
        setTimeout(() => {
          finishRedirect();
        }, 2000);
      })
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error ? error.message : t('authCallback.errors.finalizeFailed')
        );
      });
  }, [
    callbackPayload,
    client,
    isNavigationReady,
    recoveryRedirectPath,
    redirectTarget,
    router,
    successCopy.message,
    successCopy.title,
    t,
  ]);

  if (successMessage) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>{successCopy.title}</Text>
          <Text style={styles.message}>{successMessage ?? successCopy.message}</Text>
          <ActivityIndicator size='large' color='#1ccba1' style={styles.spinner} />
        </View>
        <ToastSystem toasts={toasts} onDismiss={dismissToast} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t('authCallback.errors.title', undefined, 'Sign-in failed')}
          </Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable
            onPress={() => {
              router.replace({ pathname: '/auth', params: { next: redirectTarget } });
            }}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>
              {t('authModal.actions.backToSignIn', undefined, 'Back to sign in')}
            </Text>
          </Pressable>
        </View>
        <ToastSystem toasts={toasts} onDismiss={dismissToast} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ActivityIndicator size='large' color='#1ccba1' />
      <ToastSystem toasts={toasts} onDismiss={dismissToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,11,28,0.94)',
    padding: 24,
    gap: 16,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  message: {
    color: 'rgba(248,250,252,0.82)',
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: '#1ccba1',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: '#041710',
    fontSize: 14,
    fontWeight: '700',
  },
  spinner: {
    marginTop: 16,
  },
});
