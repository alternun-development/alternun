import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  isAuthentikConfigured,
  resolveAuthentikLoginStrategy,
  startAuthentikOAuthFlow,
} from '@alternun/auth';

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function readBooleanParam(value: string | string[] | undefined, defaultValue: boolean): boolean {
  const normalized = readParam(value)?.toLowerCase();
  if (normalized == null) {
    return defaultValue;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

export default function AuthRelayRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { provider, fresh, next } = useLocalSearchParams<{
    provider?: string | string[];
    fresh?: string | string[];
    next?: string | string[];
  }>();
  const hasStartedRef = useRef(false);
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const providerHint = useMemo(() => {
    const resolved = readParam(provider);
    return resolved === 'google' || resolved === 'discord' ? resolved : null;
  }, [provider]);

  const nextTarget = useMemo(() => readParam(next), [next]);
  const forceFreshSession = useMemo(() => readBooleanParam(fresh, true), [fresh]);
  const loginStrategy = resolveAuthentikLoginStrategy();
  const providerFlowSlugs = loginStrategy.providerFlowSlugs;

  useEffect(() => {
    if (!isNavigationReady) {
      return;
    }

    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    if (loginStrategy.socialMode === 'supabase' || !providerHint) {
      router.replace(nextTarget ? { pathname: '/auth', params: { next: nextTarget } } : '/auth');
      return;
    }

    if (!isAuthentikConfigured() && loginStrategy.socialMode !== 'authentik') {
      router.replace(nextTarget ? { pathname: '/auth', params: { next: nextTarget } } : '/auth');
      return;
    }

    void startAuthentikOAuthFlow(providerHint, {
      forceFreshSession,
      providerFlowSlugs,
    }).catch(() => {
      router.replace(nextTarget ? { pathname: '/auth', params: { next: nextTarget } } : '/auth');
    });
  }, [
    forceFreshSession,
    isNavigationReady,
    loginStrategy.socialMode,
    nextTarget,
    providerFlowSlugs,
    providerHint,
    router,
  ]);

  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size='large' color='#1ccba1' />
    </View>
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
