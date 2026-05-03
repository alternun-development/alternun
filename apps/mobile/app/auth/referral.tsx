import { useLocalSearchParams, useRootNavigationState, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { writePendingReferralData } from '../../components/auth/referralStorage';

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return null;
}

export default function ReferralRoute(): React.JSX.Element {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { next, code, ref, referralCode, username, email } = useLocalSearchParams<{
    next?: string | string[];
    code?: string | string[];
    ref?: string | string[];
    referralCode?: string | string[];
    username?: string | string[];
    email?: string | string[];
  }>();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    if (!isNavigationReady) {
      return;
    }

    const resolvedReferralCode =
      readSearchParam(code) ?? readSearchParam(ref) ?? readSearchParam(referralCode) ?? '';
    const pendingReferralData = {
      referred_by_username: readSearchParam(username),
      referred_by_email: readSearchParam(email),
      referral_code: resolvedReferralCode || null,
      invitation_code: resolvedReferralCode || null,
    };

    if (
      resolvedReferralCode ??
      pendingReferralData.referred_by_username ??
      pendingReferralData.referred_by_email
    ) {
      writePendingReferralData(pendingReferralData);
    }

    router.replace({
      pathname: '/auth',
      params: {
        next: readSearchParam(next) === '/auth/referral' ? '/' : readSearchParam(next) ?? '/',
        referralCode: resolvedReferralCode ?? undefined,
        username: readSearchParam(username) ?? undefined,
        email: readSearchParam(email) ?? undefined,
      },
    });
  }, [code, email, isNavigationReady, next, ref, referralCode, router, username]);

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
