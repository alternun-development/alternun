import { useAuth, } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import PublicLandingPage from '../components/landing/PublicLandingPage';
import { useAppPreferences, } from '../components/settings/AppPreferencesProvider';
import { isBetterAuthExecutionEnabled, } from '../components/auth/authExecutionMode';
import { readPendingAuthentikOAuthProvider, } from '@alternun/auth';
import { Redirect, useRootNavigationState, useRouter, } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { ActivityIndicator, StyleSheet, View, } from 'react-native';
import { resolveMobileApiBaseUrl, } from '../utils/runtimeConfig';
import { normalizeAirsDashboardSnapshot, } from '../components/dashboard/airsSnapshot';
import type { AirsDashboardSnapshot, } from '../components/dashboard/types';

export default function HomeScreen(): React.JSX.Element {
  const { user, loading, signIn, signOutUser, client, } = useAuth();
  const { showAirsIntro, setShowAirsIntro, language, } = useAppPreferences();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [introDismissedThisSession, setIntroDismissedThisSession,] = useState(false,);
  const [airsSnapshot, setAirsSnapshot,] = useState<AirsDashboardSnapshot | null>(null,);
  const lastAirsOnboardingUserRef = useRef<string | null>(null,);
  const lastAirsSnapshotKeyRef = useRef<string | null>(null,);
  const airsSyncInFlightRef = useRef(false,);
  const pendingAuthentikProvider = readPendingAuthentikOAuthProvider();
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const isNavigationReady = Boolean(rootNavigationState?.key,);

  const shouldShowLandingPage = useMemo(
    () => !user && showAirsIntro && !introDismissedThisSession,
    [introDismissedThisSession, showAirsIntro, user,],
  );

  const handleReload = (): void => {
    void client.getUser();
  };

  const syncAirsDashboardState = useCallback(
    async (userKey: string,): Promise<void> => {
      if (airsSyncInFlightRef.current) {
        return;
      }

      airsSyncInFlightRef.current = true;

      try {
        const sessionToken = await client.getSessionToken();
        if (!sessionToken) {
          return;
        }

        const apiBaseUrl = resolveMobileApiBaseUrl().replace(/\/+$/, '',);

        if (lastAirsOnboardingUserRef.current !== userKey) {
          try {
            const onboardingResponse = await fetch(`${apiBaseUrl}/v1/airs/onboarding`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                locale: language,
              },),
            },);

            if (onboardingResponse.ok) {
              lastAirsOnboardingUserRef.current = userKey;
            }
          } catch {
            // Best-effort onboarding trigger. The backend RPC is idempotent and can retry later.
          }
        }

        const snapshotKey = `${userKey}:${language ?? ''}`;
        if (lastAirsSnapshotKeyRef.current === snapshotKey) {
          return;
        }

        const response = await fetch(
          `${apiBaseUrl}/v1/airs/me?locale=${encodeURIComponent(language ?? '',)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const snapshot = normalizeAirsDashboardSnapshot(await response.json().catch(() => null,),);
        if (!snapshot) {
          return;
        }

        setAirsSnapshot(snapshot,);
        lastAirsSnapshotKeyRef.current = snapshotKey;
      } catch {
        // Best-effort dashboard snapshot fetch. Keep the hero usable even if AIRS state is offline.
      } finally {
        airsSyncInFlightRef.current = false;
      }
    },
    [client, language,],
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

    void syncAirsDashboardState(userKey,);
  }, [client, isNavigationReady, language, loading, syncAirsDashboardState, user,],);

  if (loading || !isNavigationReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  if (!user && pendingAuthentikProvider && !isBetterAuthExecution) {
    return <Redirect href={{ pathname: '/auth', params: { next: '/', }, }} />;
  }

  if (shouldShowLandingPage) {
    return (
      <PublicLandingPage
        onSignIn={() => router.push({ pathname: '/auth', params: { next: '/', }, },)}
        onOpenSettings={() => router.push('/settings',)}
        onContinueToDashboard={(dontShowAgain,) => {
          if (dontShowAgain) {
            setShowAirsIntro(false,);
          }
          setIntroDismissedThisSession(true,);
        }}
      />
    );
  }

  if (!user) {
    return (
      <PublicLandingPage
        onSignIn={() => router.push({ pathname: '/auth', params: { next: '/', }, },)}
        onOpenSettings={() => router.push('/settings',)}
      />
    );
  }

  return (
    <Dashboard
      user={user ?? null}
      airsSnapshot={airsSnapshot}
      isLoading={loading}
      onReload={handleReload}
      onRequireSignIn={() => router.push({ pathname: '/auth', params: { next: '/', }, },)}
      onOpenProfilePage={() => router.push('/mi-perfil',)}
      onOpenSettingsPage={() => router.push('/settings',)}
      onWalletConnect={async (walletType: string,): Promise<void> => {
        await signIn({
          provider: walletType,
          flow: 'native',
        },);
      }}
      onSignOut={async (): Promise<void> => {
        setIntroDismissedThisSession(false,);
        await signOutUser();
      }}
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
},);
