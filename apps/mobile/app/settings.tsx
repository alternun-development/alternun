import { getLocaleLabel } from '@alternun/i18n';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import { useAuth } from '../components/auth/AppAuthProvider';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createTypographyStyles } from '../components/theme/typography';
import TopNav from '../components/dashboard/TopNav';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const {
    themeMode,
    language,
    showAirsIntro,
    motionLevel,
    toggleThemeMode,
    cycleLanguage,
    cycleMotionLevel,
    setShowAirsIntro,
  } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const isDark = themeMode === 'dark';

  const getMetadata = (u: typeof user): Record<string, unknown> => {
    if (!u?.metadata || typeof u.metadata !== 'object') {
      return {};
    }
    return u.metadata as Record<string, unknown>;
  };

  const getProfileInfo = (u: typeof user) => {
    if (!u) {
      return { displayName: 'Guest', email: undefined };
    }
    const metadata = getMetadata(u);
    const firstName = typeof metadata.firstName === 'string' ? metadata.firstName : '';
    const lastName = typeof metadata.lastName === 'string' ? metadata.lastName : '';
    const fullNameFromParts = `${firstName} ${lastName}`.trim();
    const nameCandidates = [
      metadata.fullName,
      metadata.full_name,
      metadata.displayName,
      metadata.display_name,
      metadata.name,
      fullNameFromParts,
    ];
    const validName = nameCandidates.find(
      (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
    );
    const emailLocalPart =
      typeof u.email === 'string' && u.email.includes('@') ? u.email.split('@')[0] : undefined;
    return {
      displayName: validName?.trim() ?? emailLocalPart ?? 'Account',
      email: u.email,
    };
  };

  const getWalletAddress = (u: typeof user): string => {
    if (!u) return '';
    const metadata = getMetadata(u);
    const walletObject =
      typeof metadata.wallet === 'object' && metadata.wallet !== null
        ? (metadata.wallet as Record<string, unknown>)
        : undefined;
    const candidates = [
      metadata.walletAddress,
      metadata.wallet_address,
      metadata.address,
      walletObject?.address,
      walletObject?.walletAddress,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) {
        return candidate;
      }
    }
    if (typeof u.providerUserId === 'string' && u.providerUserId.startsWith('0x')) {
      return u.providerUserId;
    }
    return '';
  };

  const getWalletProvider = (u: typeof user): string | null => {
    if (!u) return null;
    const metadata = getMetadata(u);
    const provider =
      typeof metadata.walletProvider === 'string'
        ? metadata.walletProvider
        : typeof metadata.wallet_provider === 'string'
        ? metadata.wallet_provider
        : null;
    if (provider && provider.trim().length > 0) {
      return provider.toLowerCase();
    }
    if (typeof u.provider === 'string' && u.provider.startsWith('wallet:')) {
      return u.provider.replace('wallet:', '').toLowerCase();
    }
    return null;
  };

  const getAuthMethodLabel = (u: typeof user): string => {
    if (!u) return 'guest';
    if (u.provider && !u.provider.startsWith('wallet:')) {
      return `auth: ${u.provider}`;
    }
    if (u.provider && u.provider.startsWith('wallet:')) {
      return 'auth: wallet';
    }
    if (u.email) {
      return 'auth: email';
    }
    return 'auth: session';
  };

  const profile = useMemo(() => getProfileInfo(user), [user]);
  const walletAddress = useMemo(() => getWalletAddress(user), [user]);
  const walletProvider = useMemo(() => getWalletProvider(user), [user]);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const authMethod = useMemo(() => getAuthMethodLabel(user), [user]);

  const userStats = useMemo(() => {
    if (!user) return null;
    const metadata = getMetadata(user);
    const stats =
      typeof metadata.stats === 'object' && metadata.stats !== null
        ? (metadata.stats as Record<string, unknown>)
        : {};
    return {
      totalAIRS: Number.isFinite(Number(stats.totalAIRS)) ? Number(stats.totalAIRS) : 0,
    };
  }, [user]);

  const handleNavigate = (key: string) => {
    if (key === 'dashboard') {
      router.push('/');
    } else if (key === 'compensation') {
      router.push('/compensaciones');
    } else if (key === 'portfolio') {
      router.push('/mis-atn');
    } else if (key === 'proyectos') {
      router.push('/proyectos');
    } else if (key === 'beneficios') {
      router.push('/beneficios');
    } else if (key === 'ranking') {
      router.push('/ranking');
    } else if (key === 'wallet') {
      router.push('/wallet');
    } else if (key === 'profile') {
      router.push('/profile');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#050510' : '#f6f8fc' }]}>
      <View style={[styles.screen, { backgroundColor: isDark ? '#050510' : '#f6f8fc' }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#0d0d1f' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
              {t('settingsScreen.sections.appearance')}
            </Text>
            <TouchableOpacity
              style={[
                styles.rowButton,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
                },
              ]}
              onPress={toggleThemeMode}
              activeOpacity={0.85}
            >
              <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
                {t('labels.theme')}
              </Text>
              <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e' }]}>
                {themeMode === 'dark' ? t('labels.dark') : t('labels.light')}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#0d0d1f' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
              {t('settingsScreen.sections.language')}
            </Text>
            <TouchableOpacity
              style={[
                styles.rowButton,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
                },
              ]}
              onPress={cycleLanguage}
              activeOpacity={0.85}
            >
              <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
                {t('settingsScreen.currentLanguage')}
              </Text>
              <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e' }]}>
                {getLocaleLabel(language, language)}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#0d0d1f' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
              {t('settingsScreen.sections.onboarding')}
            </Text>
            <TouchableOpacity
              style={[
                styles.rowButton,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)',
                },
              ]}
              onPress={() => setShowAirsIntro(!showAirsIntro)}
              activeOpacity={0.85}
            >
              <Text style={[styles.rowLabel, { color: isDark ? '#e8e8ff' : '#0f172a' }]}>
                {t('settingsScreen.showIntroAgain')}
              </Text>
              <Text style={[styles.rowValue, { color: isDark ? '#66e6c5' : '#0f766e' }]}>
                {showAirsIntro ? t('labels.no') : t('labels.yes')}
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.rowHelpText, { color: isDark ? 'rgba(232,232,255,0.58)' : '#64748b' }]}
            >
              {t('settingsScreen.localPreferenceHelp')}
            </Text>
          </View>
        </ScrollView>

        {/* Floating nav */}
        <View style={styles.floatingNav} pointerEvents='box-none'>
          <TopNav
            key={user ? 'topnav-signed-in' : 'topnav-signed-out'}
            signedIn={Boolean(user)}
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            themeMode={themeMode}
            language={language}
            authMethodLabel={authMethod}
            userDisplayName={profile.displayName}
            userEmail={profile.email}
            airsScore={userStats?.totalAIRS ?? null}
            onSignIn={() => router.replace({ pathname: '/auth', params: { next: '/settings' } })}
            onConnectWallet={() => {
              if (!user) {
                router.replace({ pathname: '/auth', params: { next: '/settings' } });
              }
            }}
            motionLevel={motionLevel}
            onToggleTheme={toggleThemeMode}
            onCycleLanguage={cycleLanguage}
            onCycleMotionLevel={cycleMotionLevel}
            onOpenProfile={() => router.push('/profile')}
            onOpenSettings={() => {}}
            onSignOut={() => {
              void signOutUser();
              router.replace('/');
            }}
            onNavigate={handleNavigate}
            onNavigateToNotifications={() => {
              router.push('/notifications');
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = createTypographyStyles({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 14,
    paddingTop: 120,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowHelpText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
