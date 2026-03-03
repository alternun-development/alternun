import { useAuth } from '../components/auth/AppAuthProvider';
import Dashboard from '../components/dashboard/Dashboard';
import AirsIntroExperience from '../components/onboarding/AirsIntroExperience';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const { showAirsIntro, setShowAirsIntro } = useAppPreferences();
  const router = useRouter();
  const [introDismissedThisSession, setIntroDismissedThisSession] = useState(false);

  useEffect(() => {
    if (user) {
      setIntroDismissedThisSession(false);
    }
  }, [user]);

  const shouldShowAirsIntro = useMemo(
    () => !user && showAirsIntro && !introDismissedThisSession,
    [introDismissedThisSession, showAirsIntro, user],
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1ccba1" />
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
        onSignIn={() => router.push('/auth')}
      />
    );
  }

  return (
    <Dashboard
      user={user ?? null}
      onRequireSignIn={() => router.push('/auth')}
      onOpenProfilePage={() => router.push('/profile' as any)}
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
