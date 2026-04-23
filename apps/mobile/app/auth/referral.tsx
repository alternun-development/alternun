import {
  clearOidcSession,
  finalizeSupabaseCallbackSession,
  handleAuthentikCallback,
  hasPendingAuthentikCallback,
  readWebAuthCallbackPayload,
  type OidcSession,
  type OidcTokens,
} from '@alternun/auth';
import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppTranslation } from '../../components/i18n/useAppTranslation';
import { useAuth } from '../../components/auth/AppAuthProvider';
import { isBetterAuthExecutionEnabled } from '../../components/auth/authExecutionMode';
import {
  authentikPreset,
  oidcSessionToUser,
  stripAuthCallbackTokensFromUrl,
  type CallbackCapableAuthClient,
} from '../../components/auth/authWebSession';
import { ToastSystem, type ToastItem } from '@alternun/ui';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { AuroraBackground } from '../../components/referral/AuroraBackground';
import { ReferralNavbar } from '../../components/referral/ReferralNavbar';

const INITIAL_CALLBACK_SEARCH = typeof window !== 'undefined' ? window.location.search : '';
const INITIAL_CALLBACK_HASH = typeof window !== 'undefined' ? window.location.hash : '';

type AuthCallbackHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

interface ReferralFormData {
  referredByUsername: string;
  referredByEmail: string;
  invitationCode: string;
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
async function getUserIdFromCallback(client: any): Promise<string | undefined> {
  try {
    const response = typeof client.getUser === 'function' ? client.getUser() : null;
    const resolved = (await Promise.resolve(response).catch(() => null)) as
      | Record<string, unknown>
      | null
      | undefined;

    if (typeof resolved === 'object' && resolved !== null && 'id' in resolved) {
      return String(resolved.id);
    }
  } catch {
    // Ignore errors getting user
  }

  return undefined;
}
/* eslint-enable */

export default function ReferralRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { next, code, username, email } = useLocalSearchParams<{
    next?: string | string[];
    code?: string | string[];
    username?: string | string[];
    email?: string | string[];
  }>();
  const { client, user } = useAuth();
  const { t } = useAppTranslation('mobile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [formData, setFormData] = useState<ReferralFormData>({
    referredByUsername: readSearchParam(username) ?? '',
    referredByEmail: readSearchParam(email) ?? '',
    invitationCode: readSearchParam(code) ?? '',
  });
  const hasHandledRef = useRef(false);
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const callbackPayload = useMemo(() => {
    return readWebAuthCallbackPayload(INITIAL_CALLBACK_SEARCH, INITIAL_CALLBACK_HASH);
  }, []);
  const isCallbackMode = useMemo(() => {
    return callbackPayload.hasPayload;
  }, [callbackPayload.hasPayload]);

  const dismissToast = (id: string): void => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const pushToast = (title: string, message: string): void => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, title, message }]);
    setTimeout(() => dismissToast(id), 4000);
  };

  const hasAnyReferralData = useMemo(() => {
    return (
      formData.referredByUsername.trim().length > 0 ||
      formData.referredByEmail.trim().length > 0 ||
      formData.invitationCode.trim().length > 0
    );
  }, [formData]);

  const saveReferralAndComplete = React.useCallback(async (userId: string): Promise<void> => {
    // Check for form data or pending data from sessionStorage
    let dataToSave = null;

    if (hasAnyReferralData) {
      dataToSave = {
        referred_by_username: formData.referredByUsername ?? null,
        referred_by_email: formData.referredByEmail ?? null,
        invitation_code: formData.invitationCode ?? null,
      };
    } else if (typeof window !== 'undefined') {
      const pending = sessionStorage.getItem('pendingReferralData');
      if (pending) {
        try {
          const parsed = JSON.parse(pending) as Record<string, unknown>;
          dataToSave = parsed as typeof dataToSave;
          sessionStorage.removeItem('pendingReferralData');
        } catch {
          // Invalid JSON, ignore
        }
      }
    }

    if (!dataToSave) {
      return;
    }

    try {
      const sessionToken = await client.getSessionToken();
      if (!sessionToken) {
        return;
      }

      const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
      const response = await fetch(`${apiBaseUrl}/v1/referrals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...dataToSave,
        }),
      });

      if (!response.ok) {
        // Best-effort save - don't fail auth if referral save fails
      }
    } catch {
      // Best-effort save - don't fail auth if referral save fails
    }
  }, [client, formData, hasAnyReferralData]);

  const handleSkip = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      if (isCallbackMode) {
        await completeAuthFlow();
      } else {
        // Standalone mode: redirect to sign in
        router.push({ pathname: '/auth', params: { next: '/auth/referral' } });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isCallbackMode) {
        await completeAuthFlow();
      } else {
        // Standalone mode: save referral to sessionStorage and redirect to sign in
        if (hasAnyReferralData) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(
              'pendingReferralData',
              JSON.stringify({
                referred_by_username: formData.referredByUsername || null,
                referred_by_email: formData.referredByEmail || null,
                invitation_code: formData.invitationCode || null,
              }),
            );
          }
        }
        router.push({ pathname: '/auth', params: { next: '/auth/referral' } });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t('authCallback.errors.finalizeFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeAuthFlow = async (): Promise<void> => {
    const callbackClient = client as CallbackCapableAuthClient;

    if (isBetterAuthExecution) {
      clearOidcSession();
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      const userId = await getUserIdFromCallback(callbackClient);
      /* eslint-enable */
      if (userId) {
        await saveReferralAndComplete(userId);
      }

      const redirectTarget = readSearchParam(next) ?? '/';
      router.replace(redirectTarget as AuthCallbackHref);
      return;
    }

    if (hasPendingAuthentikCallback(INITIAL_CALLBACK_SEARCH)) {
      let supabaseUserId: string | undefined;

      await new Promise<void>((resolve, reject) => {
        void handleAuthentikCallback(INITIAL_CALLBACK_SEARCH, {
          onSessionReady: async (_claims, _tokens: OidcTokens, session: OidcSession) => {
            supabaseUserId = await authentikPreset.onSessionReady(
              session.claims,
              session.provider
            );
          },
        })
          .then((s) => {
            callbackClient.setOidcUser?.(oidcSessionToUser(s, supabaseUserId));
            resolve();
          })
          .catch(reject);
      });

      if (supabaseUserId) {
        await saveReferralAndComplete(supabaseUserId);
      }

      const redirectTarget = readSearchParam(next) ?? '/';
      router.replace(redirectTarget as AuthCallbackHref);
      return;
    }

    if (!callbackPayload.accessToken || !callbackPayload.refreshToken) {
      throw new Error(t('authCallback.errors.missingSession'));
    }

    stripAuthCallbackTokensFromUrl(window.location.href);

    await finalizeSupabaseCallbackSession(callbackClient, {
      accessToken: callbackPayload.accessToken as string,
      refreshToken: callbackPayload.refreshToken as string,
    });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const userId = await getUserIdFromCallback(callbackClient);
    /* eslint-enable */
    if (userId) {
      await saveReferralAndComplete(userId);
    }

    setSuccessMessage(t('auth.referral.success', undefined, 'Welcome!'));
    pushToast('Success', t('auth.referral.success', undefined, 'Welcome!'));

    setTimeout(() => {
      const redirectTarget = readSearchParam(next) ?? '/';
      router.replace(redirectTarget as AuthCallbackHref);
    }, 2000);
  };

  useEffect(() => {
    if (!isNavigationReady || hasHandledRef.current || typeof window === 'undefined') {
      return;
    }

    // If no callback payload and not already authenticated, stay on referral page
    // User can fill in referral info and then sign in
    if (!callbackPayload.hasPayload && !user) {
      return;
    }

    // If no callback payload but user just authenticated, save pending referral and redirect
    if (!callbackPayload.hasPayload && user?.id) {
      hasHandledRef.current = true;
      void saveReferralAndComplete(user.id).then(() => {
        router.replace('/');
      });
      return;
    }
  }, [isNavigationReady, callbackPayload, router, user, saveReferralAndComplete]);

  if (successMessage) {
    return (
      <View style={styles.container}>
        <AuroraBackground />
        <ReferralNavbar user={user} />
        <View style={styles.screen}>
          <View style={styles.card}>
          <Text style={styles.title}>
            {t('auth.referral.successTitle', undefined, 'All Set!')}
          </Text>
          <Text style={styles.message}>{successMessage}</Text>
          <ActivityIndicator size="large" color="#1ccba1" style={styles.spinner} />
          </View>
          <ToastSystem toasts={toasts} onDismiss={dismissToast} />
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <AuroraBackground />
        <ReferralNavbar user={user} />
        <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t('authCallback.errors.title', undefined, 'Error')}
          </Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Pressable onPress={() => router.replace('/auth')} style={styles.button}>
            <Text style={styles.buttonLabel}>
              {t('authModal.actions.backToSignIn', undefined, 'Back to sign in')}
            </Text>
          </Pressable>
        </View>
        <ToastSystem toasts={toasts} onDismiss={dismissToast} />
      </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuroraBackground />
      <ReferralNavbar user={user} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <View style={styles.card}>
        <Text style={styles.title}>{t('auth.referral.title', undefined, 'You\'re Invited!')}</Text>
        <Text style={styles.description}>
          {user
            ? t(
              'auth.referral.description',
              undefined,
              'Help us learn how you heard about us. You can skip this if you prefer.'
            )
            : t(
              'auth.referral.standaloneDescription',
              undefined,
              'Help us learn how you heard about us, then sign in to get started.'
            )}
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('auth.referral.referredByUsername', undefined, 'Referred by username (optional)')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.referral.usernamePlaceholder', undefined, 'e.g., @john_doe')}
            placeholderTextColor="rgba(248, 250, 252, 0.4)"
            value={formData.referredByUsername}
            onChangeText={(text) =>
              setFormData({ ...formData, referredByUsername: text })
            }
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('auth.referral.referredByEmail', undefined, 'Referred by email (optional)')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.referral.emailPlaceholder', undefined, 'e.g., friend@example.com')}
            placeholderTextColor="rgba(248, 250, 252, 0.4)"
            keyboardType="email-address"
            value={formData.referredByEmail}
            onChangeText={(text) =>
              setFormData({ ...formData, referredByEmail: text })
            }
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            {t('auth.referral.invitationCode', undefined, 'Invitation code (optional)')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.referral.codePlaceholder', undefined, 'e.g., INVITE123')}
            placeholderTextColor="rgba(248, 250, 252, 0.4)"
            value={formData.invitationCode}
            onChangeText={(text) =>
              setFormData({ ...formData, invitationCode: text })
            }
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.buttonGroup}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#041710" />
            ) : (
              <Text style={styles.buttonLabel}>
                {user
                  ? t('auth.referral.submit', undefined, 'Continue')
                  : t('auth.referral.submitStandalone', undefined, 'Continue to Sign In')}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              void handleSkip();
            }}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonLabel}>
              {user
                ? t('auth.referral.skip', undefined, 'Skip')
                : t('auth.referral.skipStandalone', undefined, 'Continue without Referral')}
            </Text>
          </Pressable>
        </View>
      </View>
      <ToastSystem toasts={toasts} onDismiss={dismissToast} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
    position: 'relative',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginTop: 80,
  },
  screenContent: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10,11,28,0.94)',
    padding: 24,
    gap: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  description: {
    color: 'rgba(248,250,252,0.82)',
    fontSize: 14,
    lineHeight: 21,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    color: 'rgba(248,250,252,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 12,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1ccba1',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  buttonLabel: {
    color: '#041710',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  spinner: {
    marginTop: 16,
  },
});
