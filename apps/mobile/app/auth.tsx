import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthSignInScreen from '../components/auth/AuthSignInScreen';
import { useAuth } from '../components/auth/AppAuthProvider';
import { resolveInitialAuthMode } from '../components/auth/authRouteMode';
import { resolveAuthReturnTo } from '@alternun/auth';
import {
  clearPendingReferralData,
  hasPendingReferralData,
  readPendingReferralData,
  writePendingReferralData,
  type PendingReferralData,
} from '../components/auth/referralStorage';
import {
  buildReferralPersistenceKey,
  savePendingReferralData,
} from '../components/auth/referralPersistence';

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

function buildPendingReferralData(
  referralCode: string | null,
  referredByUsername: string | null,
  referredByEmail: string | null
): PendingReferralData | null {
  const normalizedReferralCode = referralCode?.trim().toLowerCase() ?? '';
  const normalizedUsername = referredByUsername?.trim() ?? '';
  const normalizedEmail = referredByEmail?.trim() ?? '';

  if (!normalizedReferralCode && !normalizedUsername && !normalizedEmail) {
    return null;
  }

  return {
    referral_code: normalizedReferralCode || null,
    invitation_code: normalizedReferralCode || null,
    referred_by_username: normalizedUsername || null,
    referred_by_email: normalizedEmail || null,
  };
}

type AuthRouteHref = Parameters<ReturnType<typeof useRouter>['replace']>[0];

export default function AuthRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { next, mode, code, ref, referralCode, username, email } = useLocalSearchParams<{
    next?: string | string[];
    mode?: string | string[];
    code?: string | string[];
    ref?: string | string[];
    referralCode?: string | string[];
    username?: string | string[];
    email?: string | string[];
  }>();
  const { user, loading } = useAuth();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const hasInjectedReferralRef = useRef(false);
  const pendingReferralPersistenceKeyRef = useRef<string | null>(null);
  const redirectKeyRef = useRef<string | null>(null);

  const requestedNext = readSearchParam(next);
  const safeNext = requestedNext === '/auth/referral' ? '/' : requestedNext ?? '/';
  const redirectHref = resolveAuthReturnTo(safeNext);
  const requestedMode = readSearchParam(mode);
  const requestedReferralCode =
    readSearchParam(code) ?? readSearchParam(ref) ?? readSearchParam(referralCode);
  const requestedReferralData = useMemo(
    () =>
      buildPendingReferralData(
        requestedReferralCode,
        readSearchParam(username),
        readSearchParam(email)
      ),
    [email, requestedReferralCode, username]
  );

  useEffect(() => {
    if (hasInjectedReferralRef.current || !requestedReferralData) {
      return;
    }

    hasInjectedReferralRef.current = true;
    writePendingReferralData(requestedReferralData);
  }, [requestedReferralData]);

  useEffect(() => {
    if (!isNavigationReady || loading || !user) {
      return;
    }

    if (hasPendingReferralData()) {
      const pendingReferral = readPendingReferralData();
      if (pendingReferral) {
        const persistenceKey = buildReferralPersistenceKey(user.id, pendingReferral);
        if (pendingReferralPersistenceKeyRef.current === persistenceKey) {
          return;
        }

        pendingReferralPersistenceKeyRef.current = persistenceKey;
        void savePendingReferralData(user.id, pendingReferral)
          .then(() => {
            clearPendingReferralData();
            router.replace(redirectHref as AuthRouteHref);
          })
          .catch(() => {
            // Keep the referral in session storage so the next auth pass can retry.
            pendingReferralPersistenceKeyRef.current = null;
          });
        return;
      }
    }

    const redirectKey = `${user.id}:${JSON.stringify(redirectHref)}`;
    if (redirectKeyRef.current === redirectKey) {
      return;
    }

    redirectKeyRef.current = redirectKey;
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
      initialMode={resolveInitialAuthMode(requestedMode, Boolean(requestedReferralData))}
      initialReferralCode={requestedReferralData?.referral_code ?? null}
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
