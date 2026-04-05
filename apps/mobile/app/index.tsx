import { useAuth } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import AirsIntroExperience from '../components/onboarding/AirsIntroExperience';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { readPendingAuthentikOAuthProvider } from '@alternun/auth';
import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function HomeScreen(): React.JSX.Element {
  const { user, loading, signIn, signOutUser } = useAuth();
  const { showAirsIntro, setShowAirsIntro } = useAppPreferences();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [introDismissedThisSession, setIntroDismissedThisSession] = useState(false);
  const pendingAuthentikProvider = readPendingAuthentikOAuthProvider();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    if (user) {
      setIntroDismissedThisSession(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isNavigationReady || user != null) {
      return;
    }

    if (pendingAuthentikProvider == null) {
      return;
    }

    router.replace({ pathname: '/auth', params: { next: '/' } });
  }, [isNavigationReady, pendingAuthentikProvider, router, user]);

  const shouldShowAirsIntro = useMemo(
    () => !user && showAirsIntro && !introDismissedThisSession,
    [introDismissedThisSession, showAirsIntro, user]
  );

  if (loading || !isNavigationReady || (!user && pendingAuthentikProvider)) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  if (shouldShowAirsIntro) {
    return (
      <AirsIntroExperience
        onContinueToDashboard={(dontShowAgain) => {
          if (dontShowAgain) {
            setShowAirsIntro(false);
          }
          setIntroDismissedThisSession(true);
        }}
        onSignIn={() => router.push({ pathname: '/auth', params: { next: '/' } })}
      />
    );
  }

  return (
    <Dashboard
      user={user ?? null}
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
