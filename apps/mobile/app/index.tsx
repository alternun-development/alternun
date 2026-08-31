/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { useAuth } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import { useAirsDashboardSnapshot } from '../components/dashboard/AirsDashboardProvider';
import PublicLandingPage from '../components/landing/PublicLandingPage';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { isBetterAuthExecutionEnabled } from '../components/auth/authExecutionMode';
import { buildWebAuthCallbackRedirectPath } from '../components/auth/authCallbackFlow';
import { readPendingAuthentikOAuthProvider } from '@alternun/auth';
import {
  Redirect,
  useFocusEffect,
  usePathname,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function HomeScreen(): React.JSX.Element {
  const { user, loading, signIn, signOutUser, client } = useAuth();
  const { showAirsIntro, setShowAirsIntro } = useAppPreferences();
  const {
    snapshot: airsSnapshot,
    isLoading: airsIsLoading,
    error: airsError,
    refresh: refreshAirsSnapshot,
  } = useAirsDashboardSnapshot();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const [introDismissedThisSession, setIntroDismissedThisSession] = useState(false);
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

  useEffect(() => {
    if (!webAuthCallbackRedirectPath || typeof window === 'undefined') {
      return;
    }

    // Already on the callback route — let /auth/callback handle it.
    // A full-page window.location.replace() here races the callback handler
    // and causes an infinite reload loop for new users finishing Google sign-up.
    if (pathname === '/auth/callback') {
      return;
    }

    window.location.replace(webAuthCallbackRedirectPath);
  }, [webAuthCallbackRedirectPath, pathname]);

  useFocusEffect(
    useCallback(() => {
      void refreshAirsSnapshot();
    }, [refreshAirsSnapshot])
  );

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
      airsIsLoading={airsIsLoading}
      airsError={airsError}
      isLoading={loading}
      onReload={refreshAirsSnapshot}
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
