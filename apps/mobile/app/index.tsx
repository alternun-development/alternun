/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { useAuth } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import PublicLandingPage from '../components/landing/PublicLandingPage';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { isBetterAuthExecutionEnabled } from '../components/auth/authExecutionMode';
import { buildWebAuthCallbackRedirectPath } from '../components/auth/authCallbackFlow';
import { readPendingAuthentikOAuthProvider } from '@alternun/auth';
import { Redirect, useRootNavigationState, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { resolveMobileApiBaseUrl } from '../utils/runtimeConfig';
import { normalizeAirsDashboardSnapshot } from '../components/dashboard/airsSnapshot';
import type { AirsDashboardSnapshot } from '../components/dashboard/types';

export default function HomeScreen(): React.JSX.Element {
  const { user, loading, signIn, signOutUser, client } = useAuth();
  const { showAirsIntro, setShowAirsIntro, language } = useAppPreferences();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [introDismissedThisSession, setIntroDismissedThisSession] = useState(false);
  const [airsSnapshot, setAirsSnapshot] = useState<AirsDashboardSnapshot | null>(null);
  const lastAirsOnboardingUserRef = useRef<string | null>(null);
  const lastAirsSnapshotKeyRef = useRef<string | null>(null);
  const airsSyncInFlightRef = useRef(false);
  const pendingAuthentikProvider = readPendingAuthentikOAuthProvider();
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const webAuthCallbackRedirectPath = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return buildWebAuthCallbackRedirectPath(window.location.search, window.location.hash);
  }, []);

  const shouldShowLandingPage = useMemo(
    () => !user && showAirsIntro && !introDismissedThisSession,
    [introDismissedThisSession, showAirsIntro, user]
  );

  const handleReload = (): void => {
    lastAirsSnapshotKeyRef.current = null;
    void client.getUser();
  };

  useEffect(() => {
    if (!webAuthCallbackRedirectPath || typeof window === 'undefined') {
      return;
    }

    window.location.replace(webAuthCallbackRedirectPath);
  }, [webAuthCallbackRedirectPath]);

  const FALLBACK_SNAPSHOT = useMemo(
    () =>
      normalizeAirsDashboardSnapshot({
        balanceAIRS: 10,
        lifetimeEarnedAIRS: 10,
        recentEntries: [],
        registrationBonusClaimed: false,
      }),
    []
  );

  const syncAirsDashboardState = useCallback(
    async (userKey: string): Promise<void> => {
      if (airsSyncInFlightRef.current) {
        return;
      }

      airsSyncInFlightRef.current = true;

      // Abort signal with 8 second timeout — on expiry we fall back to dummy data
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const sessionToken = await client.getSessionToken();
        if (!sessionToken) {
          setAirsSnapshot(FALLBACK_SNAPSHOT);
          return;
        }

        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '');
        const snapshotKey = `${userKey}:${language ?? ''}`;

        if (lastAirsOnboardingUserRef.current !== userKey) {
          try {
            const onboardingResponse = await fetch(`${apiBaseUrl}/v1/airs/onboarding`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ locale: language }),
              signal: controller.signal,
            });

            if (onboardingResponse.ok) {
              const onboardingSnapshot = normalizeAirsDashboardSnapshot(
                await onboardingResponse.json().catch(() => null)
              );
              if (onboardingSnapshot) {
                setAirsSnapshot(onboardingSnapshot);
                lastAirsSnapshotKeyRef.current = snapshotKey;
              }
              lastAirsOnboardingUserRef.current = userKey;
            }
          } catch {
            // Best-effort onboarding trigger — idempotent, safe to skip.
          }
        }

        // Fetch current balance from /airs/me
        try {
          const meResponse = await fetch(`${apiBaseUrl}/v1/airs/me`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${sessionToken}` },
            signal: controller.signal,
          });

          if (meResponse.ok) {
            const meSnapshot = normalizeAirsDashboardSnapshot(
              await meResponse.json().catch(() => null)
            );
            if (meSnapshot) {
              setAirsSnapshot(meSnapshot);
              lastAirsSnapshotKeyRef.current = snapshotKey;
              return;
            }
          }
        } catch {
          // Fall through to fallback below
        }

        // If we reach here without setting a snapshot, apply fallback so 0 is never shown
        setAirsSnapshot((prev) => prev ?? FALLBACK_SNAPSHOT);
      } catch {
        setAirsSnapshot((prev) => prev ?? FALLBACK_SNAPSHOT);
      } finally {
        clearTimeout(timeoutId);
        airsSyncInFlightRef.current = false;
      }
    },
    [client, language, FALLBACK_SNAPSHOT]
  );

  useEffect(() => {
    if (loading || !isNavigationReady || !user) {
      return;
    }

    const userKey = typeof user.id === 'string' && user.id.trim().length > 0 ? user.id : user.email;
    if (!userKey || airsSyncInFlightRef.current) {
      return;
    }

    const snapshotKey = `${userKey}:${language ?? ''}`;
    if (
      lastAirsSnapshotKeyRef.current === snapshotKey &&
      lastAirsOnboardingUserRef.current === userKey
    ) {
      return;
    }

    void syncAirsDashboardState(userKey);
  }, [client, isNavigationReady, language, loading, syncAirsDashboardState, user]);

  if (webAuthCallbackRedirectPath) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  if (loading || !isNavigationReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  if (!user && pendingAuthentikProvider && !isBetterAuthExecution) {
    return <Redirect href={{ pathname: '/auth', params: { next: '/' } }} />;
  }

  if (shouldShowLandingPage) {
    return (
      <PublicLandingPage
        onSignIn={() => router.push({ pathname: '/auth', params: { next: '/' } })}
        onOpenSettings={() => router.push('/settings')}
        onContinueToDashboard={(dontShowAgain) => {
          if (dontShowAgain) {
            setShowAirsIntro(false);
          }
          setIntroDismissedThisSession(true);
        }}
      />
    );
  }

  if (!user) {
    return (
      <PublicLandingPage
        onSignIn={() => router.push({ pathname: '/auth', params: { next: '/' } })}
        onOpenSettings={() => router.push('/settings')}
      />
    );
  }

  return (
    <Dashboard
      user={user ?? null}
      airsSnapshot={airsSnapshot}
      isLoading={loading}
      onReload={handleReload}
      onRequireSignIn={() => router.push({ pathname: '/auth', params: { next: '/' } })}
      onOpenProfilePage={() => router.push('/mi-perfil')}
      onOpenSettingsPage={() => router.push('/settings')}
      onWalletConnect={async (walletType: string): Promise<void> => {
        await signIn({
          provider: walletType,
          flow: 'native',
        });
      }}
      onSignOut={async (): Promise<void> => {
        setIntroDismissedThisSession(false);
        await signOutUser();
      }}
      client={client}
    />
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#050510',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
