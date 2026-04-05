import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthSignInScreen from '../components/auth/AuthSignInScreen';
import { useAuth } from '../components/auth/AppAuthProvider';
import { resolveAuthReturnTo } from '@alternun/auth';

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

type AuthRouteHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export default function AuthRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { user, loading } = useAuth();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const requestedNext = readSearchParam(next);
  const redirectHref = resolveAuthReturnTo(requestedNext ?? '/');

  useEffect(() => {
    if (!isNavigationReady || loading || !user) {
      return;
    }

    router.replace(redirectHref as AuthRouteHref);
  }, [isNavigationReady, loading, redirectHref, router, user]);

  if (loading || !isNavigationReady || user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  return (
    <AuthSignInScreen
      presentation='modal'
      authReturnTo={redirectHref}
      onCancel={() => {
        router.replace(redirectHref as AuthRouteHref);
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
