import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthSignInScreen from '../components/auth/AuthSignInScreen';
import { useAuth } from '../components/auth/AppAuthProvider';
import {
  AUTHENTIK_INITIAL_SEARCH,
  isAuthentikCallbackSearch,
  readSearchParam,
  readStoredReturnTo,
  resolveReturnTarget,
  storeReturnTo,
} from '../services/auth/authSession';

type AuthRouteHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export default function AuthRoute(): React.JSX.Element {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { user, loading } = useAuth();

  const requestedNext = readSearchParam(next);
  const initialSearch = useMemo(() => AUTHENTIK_INITIAL_SEARCH || '', []);
  const isCallbackRedirect = isAuthentikCallbackSearch(initialSearch);

  const redirectTarget = useMemo(() => {
    if (isCallbackRedirect) {
      return resolveReturnTarget(readStoredReturnTo());
    }

    return resolveReturnTarget(requestedNext ?? '/');
  }, [isCallbackRedirect, requestedNext]);

  useEffect(() => {
    if (typeof window === 'undefined' || isCallbackRedirect) {
      return;
    }

    storeReturnTo(redirectTarget);
  }, [isCallbackRedirect, redirectTarget]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size='large' color='#1ccba1' />
      </View>
    );
  }

  const redirectHref = redirectTarget as AuthRouteHref;

  if (user) {
    return <Redirect href={redirectHref} />;
  }

  return (
    <AuthSignInScreen
      presentation='modal'
      onCancel={() => {
        router.replace(redirectHref);
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
