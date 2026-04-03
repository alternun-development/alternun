import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthSignInScreen from '../components/auth/AuthSignInScreen';
import { useAuth } from '../components/auth/AppAuthProvider';
import { hasPendingAuthentikCallback, resolveSafeRedirect } from '@alternun/auth';

// Capture at module load time so it survives Expo Router's URL cleanup.
const AUTHENTIK_INITIAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';

const AUTH_RETURN_TO_KEY = 'alternun:auth:return-to';

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function isAuthentikCallbackSearch(searchString?: string): boolean {
  return hasPendingAuthentikCallback(searchString ?? '');
}

function readStoredReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  return stored?.trim() ?? null;
}

function storeReturnTo(target: string): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, target);
  }
}

function normalizeInternalHref(target: string): string {
  if (target.startsWith('/') && !target.startsWith('//')) return target;
  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}

function resolveReturnTarget(target: string | null | undefined): string {
  const allowedOrigins = typeof window !== 'undefined' ? [window.location.origin] : [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const safe = resolveSafeRedirect(target ?? '/', { allowedOrigins, fallbackUrl: '/' }) as string;
  return normalizeInternalHref(safe);
}

type AuthRouteHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export default function AuthRoute(): React.JSX.Element {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const { user, loading } = useAuth();

  const requestedNext = readSearchParam(next);
  const initialSearch = AUTHENTIK_INITIAL_SEARCH;
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

  const redirectHref = redirectTarget;

  if (user) {
    return <Redirect href={redirectHref as AuthRouteHref} />;
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
