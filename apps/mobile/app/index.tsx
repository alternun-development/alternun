import { useAuth } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import PublicLandingPage from '../components/landing/PublicLandingPage';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { isBetterAuthExecutionEnabled } from '../components/auth/authExecutionMode';
import { readPendingAuthentikOAuthProvider } from '@alternun/auth';
import { Redirect, useRootNavigationState, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function HomeScreen(): React.JSX.Element {
  const { user, loading, signIn, signOutUser, client } = useAuth();
  const { showAirsIntro, setShowAirsIntro } = useAppPreferences();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [introDismissedThisSession, setIntroDismissedThisSession] = useState(false);
  const pendingAuthentikProvider = readPendingAuthentikOAuthProvider();
  const isBetterAuthExecution = isBetterAuthExecutionEnabled();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const shouldShowLandingPage = useMemo(
    () => !user && showAirsIntro && !introDismissedThisSession,
    [introDismissedThisSession, showAirsIntro, user]
  );

  const handleReload = (): void => {
    void client.getUser();
  };

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
      isLoading={loading}
      onReload={handleReload}
      onRequireSignIn={() => router.push({ pathname: '/auth', params: { next: '/' } })}
      onOpenProfilePage={() => router.push('/profile')}
      onOpenSettingsPage={() => router.push('/settings')}
      onWalletConnect={async (walletType: string) => {
        await signIn({
          provider: walletType,
          flow: 'native',
        });
      }}
      onSignOut={async () => {
        setIntroDismissedThisSession(false);
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
});
