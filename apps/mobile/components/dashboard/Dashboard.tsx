/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import React, { useCallback, useMemo, useState } from 'react';
import type { User } from '../auth/AppAuthProvider';
import {
  View,
  ScrollView,
  StatusBar,
  Text,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';

import AppInfoFooter from '../common/AppInfoFooter';
import { createTypographyStyles } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider } from '@alternun/ui';
import { useAppTranslation } from '../i18n/useAppTranslation';

import TopNav from './TopNav';
import HeroStats from './HeroStats';
import ActivityFeed from './ActivityFeed';
import AIRSLeaderboard from './AIRSLeaderboard';
import DashboardSummaryCards from './DashboardSummaryCards';
import WalletConnectModal from './WalletConnectModal';
import WelcomeBonusModal from './WelcomeBonusModal';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useNotifications } from '../notifications/NotificationsContext';
import { ToastSystem, type ToastItem, type ToastType } from '@alternun/ui';
import { useBackToTop } from '../../hooks/useBackToTop';
import { USE_V2_NAV } from '../navigation/featureFlags';
import { BackToTopButton } from '../common/BackToTopButton';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import type { AirsDashboardSnapshot } from './types';

let toastIdCounter = 0;

interface AuthClient {
  getSessionToken(): Promise<string | null>;
  getUser?: () => Promise<unknown>;
}

interface DashboardProps {
  user: User | null;
  airsSnapshot?: AirsDashboardSnapshot | null;
  /** When true the hero stats and section headers render as skeletons */
  isLoading?: boolean;
  /** Called when user taps the reload button in HeroStats */
  onReload?: () => void;
  onRequireSignIn: () => void;
  onOpenProfilePage: () => void;
  onOpenSettingsPage: () => void;
  onWalletConnect: (walletType: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  client: AuthClient;
}
type UserMetadata = Record<string, unknown>;

interface DashboardStats {
  totalAIRS: number;
  activePositions: number;
  tokensHeld: number;
  compensationsCompleted: number;
}

interface ProfileInfo {
  displayName: string;
  email?: string;
}

function getMetadata(user: User | null): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') {
    return {};
  }

  return user.metadata as UserMetadata;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function firstValidNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const value = readNumber(candidate);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function clampToPositiveInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function getUserDashboardStats(user: User | null): DashboardStats | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user);
  const stats =
    typeof metadata.stats === 'object' && metadata.stats !== null
      ? (metadata.stats as UserMetadata)
      : {};

  return {
    totalAIRS: clampToPositiveInteger(
      firstValidNumber(
        stats.totalAIRS,
        stats.totalAirs,
        stats.total_airs,
        metadata.totalAIRS,
        metadata.totalAirs,
        metadata.total_airs,
        metadata.airs
      ) ?? 0
    ),
    activePositions: clampToPositiveInteger(
      firstValidNumber(
        stats.activePositions,
        stats.active_positions,
        metadata.activePositions,
        metadata.active_positions
      ) ?? 0
    ),
    tokensHeld: clampToPositiveInteger(
      firstValidNumber(
        stats.tokensHeld,
        stats.tokens_held,
        metadata.tokensHeld,
        metadata.tokens_held
      ) ?? 0
    ),
    compensationsCompleted: clampToPositiveInteger(
      firstValidNumber(
        stats.compensationsCompleted,
        stats.compensations_completed,
        metadata.compensationsCompleted,
        metadata.compensations_completed
      ) ?? 0
    ),
  };
}

function getUserProfileInfo(user: User | null): ProfileInfo {
  if (!user) {
    return { displayName: 'Guest' };
  }

  const metadata = getMetadata(user);
  const firstName =
    typeof metadata.firstName === 'string'
      ? metadata.firstName
      : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : '';
  const lastName =
    typeof metadata.lastName === 'string'
      ? metadata.lastName
      : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : '';

  const fullNameFromParts = `${firstName} ${lastName}`.trim();

  const rawNameCandidates = [
    metadata.fullName,
    metadata.full_name,
    metadata.displayName,
    metadata.display_name,
    metadata.name,
    fullNameFromParts,
  ];

  const nameCandidate = rawNameCandidates.find(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );

  const emailLocalPart =
    typeof user.email === 'string' && user.email.includes('@')
      ? user.email.split('@')[0]
      : undefined;

  return {
    displayName: nameCandidate?.trim() ?? emailLocalPart ?? 'Account',
    email: user.email,
  };
}

function getWalletAddress(user: User | null): string {
  if (!user) {
    return '';
  }

  const metadata = getMetadata(user);
  const walletObject =
    typeof metadata.wallet === 'object' && metadata.wallet !== null
      ? (metadata.wallet as Record<string, unknown>)
      : undefined;

  const metadataCandidates = [
    metadata.walletAddress,
    metadata.wallet_address,
    metadata.address,
    walletObject?.address,
    walletObject?.walletAddress,
  ];

  for (const candidate of metadataCandidates) {
    if (typeof candidate === 'string' && candidate.startsWith('0x') && candidate.length >= 10) {
      return candidate;
    }
  }

  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x')) {
    return user.providerUserId;
  }

  if (user.id.includes('0x')) {
    const candidate = user.id.slice(user.id.indexOf('0x'));
    if (candidate.length >= 10) {
      return candidate;
    }
  }

  return '';
}

function getWalletProvider(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user);
  const provider =
    typeof metadata.walletProvider === 'string'
      ? metadata.walletProvider
      : typeof metadata.wallet_provider === 'string'
      ? metadata.wallet_provider
      : null;

  if (provider && provider.trim().length > 0) {
    return provider.toLowerCase();
  }

  if (typeof user.provider === 'string' && user.provider.startsWith('wallet:')) {
    return user.provider.replace('wallet:', '').toLowerCase();
  }

  return null;
}

function getAuthMethodLabel(user: User | null): string {
  if (!user) {
    return 'guest';
  }

  if (user.provider && !user.provider.startsWith('wallet:')) {
    return `auth: ${user.provider}`;
  }

  if (user.provider && user.provider.startsWith('wallet:')) {
    return 'auth: wallet';
  }

  if (user.email) {
    return 'auth: email';
  }

  return 'auth: session';
}

export default function Dashboard({
  user,
  airsSnapshot,
  isLoading = false,
  onReload,
  onRequireSignIn,
  onOpenProfilePage,
  onOpenSettingsPage,
  onWalletConnect,
  onSignOut,
  client,
}: DashboardProps): React.JSX.Element {
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusAlreadyClaimedOverride, setBonusAlreadyClaimedOverride] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const [topNavHeight, setTopNavHeight] = useState(0);
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const scrollTopInset = Math.max(topNavHeight > 0 ? topNavHeight + 16 : 0, isMobile ? 88 : 104);
  const scrollBottomInset = isMobile ? 18 : 8;
  const {
    themeMode,
    language,
    motionLevel,
    showWelcomeBonusModal,
    setShowWelcomeBonusModal,
    toggleThemeMode,
    cycleLanguage,
    cycleMotionLevel,
  } = useAppPreferences();
  const {
    items: notificationItems,
    markAllRead: markAllNotificationsRead,
    deleteNotif: dismissNotification,
    addNotification,
  } = useNotifications();
  const router = useRouter();
  const isDark = themeMode === 'dark';
  const t = useAppTranslation();

  const { scrollRef, showBackToTop, handleScroll, scrollToTop, bounceStyle } = useBackToTop({
    scrollThreshold: 200,
  });

  // Reload handler for both pull-to-refresh and button tap
  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true);
    try {
      // Call the onReload callback from auth provider to refresh user data
      if (onReload) {
        onReload();
      }
      // Simulate a small delay to show loading state (in practice, auth refresh takes time)
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    } catch (error) {
      setIsRefreshing(false);
    }
  }, [onReload]);

  const addToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    setBonusAlreadyClaimedOverride(false);
  }, [user?.id]);

  const claimRegistrationBonus = useCallback(async (): Promise<void> => {
    try {
      const sessionToken = await client.getSessionToken();
      if (!sessionToken) {
        return;
      }

      const response = await fetch(
        `${resolveMobileApiBaseUrl()}/v1/airs/registration-bonus/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        const result = (await response.json()) as { success?: boolean; awarded?: boolean };
        const wasAwarded = result.success ?? result.awarded ?? false;
        setBonusAlreadyClaimedOverride(true);

        // Show the modal only if preference is enabled
        if (showWelcomeBonusModal) {
          setBonusModalVisible(true);
        }

        addNotification({
          type: 'success',
          title: t.t('dashboard.notifications.welcomeBonus.title'),
          body: t.t('dashboard.notifications.welcomeBonus.message'),
          timestamp: new Date(),
          read: false,
          archived: false,
        });

        if (wasAwarded) {
          lastAirsSnapshotKeyRef.current = null;
          void client.getUser?.();
        }
      }
    } catch {
      // Silently fail - bonus is nice to have but not critical
    }
  }, [client, showWelcomeBonusModal, t, addNotification]);

  // Periodically check if email was verified (for newly verified users)
  React.useEffect(() => {
    if (!user || user.emailVerified) {
      return;
    }

    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      void client.getUser();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [user, client]);

  const walletAddress = getWalletAddress(user);
  const walletProvider = getWalletProvider(user);
  const walletConnected = Boolean(walletAddress || walletProvider);
  const authMethodLabel = getAuthMethodLabel(user);
  const userStats = useMemo(() => getUserDashboardStats(user), [user]);
  const profileInfo = useMemo(() => getUserProfileInfo(user), [user]);
  const airsScore = airsSnapshot?.balanceAIRS;
  const airsLoading = !airsSnapshot;
  const bonusAlreadyClaimed =
    Boolean(airsSnapshot?.registrationBonusClaimed) || bonusAlreadyClaimedOverride;

  const handleRequireSignIn = useCallback(() => {
    onRequireSignIn();
  }, [onRequireSignIn]);

  const handleOpenWalletConnect = useCallback(() => {
    if (!user) {
      addToast(
        'info',
        t.t('dashboard.notifications.signInRequired.title'),
        t.t('dashboard.notifications.signInRequired.message')
      );
      onRequireSignIn();
      return;
    }

    setWalletModalVisible(true);
  }, [addToast, onRequireSignIn, user, t]);

  const handleConnect = useCallback(
    async (walletType: string) => {
      setWalletModalVisible(false);
      try {
        await onWalletConnect(walletType);
        addToast(
          'success',
          t.t('dashboard.notifications.walletConnected.title'),
          t.t('dashboard.notifications.walletConnected.message')
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to connect wallet at this time.';
        addToast('error', t.t('dashboard.notifications.walletConnectionFailed.title'), message);
      }
    },
    [addToast, onWalletConnect, t]
  );

  const handleSignOut = useCallback(async () => {
    if (!user) {
      onRequireSignIn();
      return;
    }

    try {
      await onSignOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign out right now.';
      addToast('error', t.t('dashboard.notifications.signOutFailed.title'), message);
    }
  }, [addToast, onRequireSignIn, onSignOut, user, t]);

  const handleOpenProfile = useCallback(() => {
    onOpenProfilePage();
  }, [onOpenProfilePage]);

  const handleOpenSettings = useCallback(() => {
    onOpenSettingsPage();
  }, [onOpenSettingsPage]);

  const handleNavigate = useCallback(
    (key: string) => {
      switch (key) {
        case 'mi-perfil':
          onOpenProfilePage();
          break;
        case 'mi-perfil:wallet':
          router.push({ pathname: '/mi-perfil', params: { tab: 'wallet' } });
          break;
        case 'portafolio':
          router.push('/portafolio');
          break;
        case 'explorar':
          router.push('/explorar');
          break;
        default:
          break;
      }
    },
    [onOpenProfilePage, router]
  );

  return (
    <ThemeProvider mode={isDark ? 'dark' : 'light'}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#050510' : '#f6f8fc'}
        />
        <View style={[styles.container, { backgroundColor: isDark ? '#050510' : '#f6f8fc' }]}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: scrollTopInset,
                paddingBottom: scrollBottomInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={isDark ? '#1ee6b5' : '#0b5a5f'}
              />
            }
          >
            <View style={styles.scrollInner}>
              <HeroStats
                totalAIRS={airsScore}
                activePositions={userStats ? userStats.activePositions : null}
                tokensHeld={userStats ? userStats.tokensHeld : null}
                compensationsCompleted={userStats ? userStats.compensationsCompleted : null}
                isLoading={isLoading || isRefreshing || airsLoading}
                onReload={handleRefresh}
                previewMode={!user}
                isDark={isDark}
                displayName={profileInfo.displayName}
              />

              {!user ? (
                <View style={styles.authHintRow}>
                  <Text
                    style={[
                      styles.authHintText,
                      { color: isDark ? 'rgba(232,232,255,0.72)' : '#475569' },
                    ]}
                  >
                    {t.t('dashboard.hero.hint')}
                  </Text>
                </View>
              ) : null}

              {/* ── Recent Activity + Summary Cards ─────────────────────── */}
              <SectionDivider isDark={isDark} />
              <ActivityFeed
                isDark={isDark}
                entries={airsSnapshot?.recentEntries ?? []}
                isLoading={isLoading || airsLoading}
              />
              <SectionDivider isDark={isDark} />
              <AIRSLeaderboard isDark={isDark} client={client} signedIn={Boolean(user)} />
              <DashboardSummaryCards
                isDark={isDark}
                onNavigate={handleNavigate}
                client={client}
                signedIn={Boolean(user)}
                airsBalance={airsSnapshot?.balanceAIRS}
              />
            </View>
          </ScrollView>

          {!(isMobile && USE_V2_NAV) && (
            <View
              style={styles.stickyBottom}
              onLayout={(event) => {
                setFooterHeight(event.nativeEvent.layout.height);
              }}
            >
              <AppInfoFooter containerStyle={{ marginTop: 0 }} />
            </View>
          )}

          <BackToTopButton
            visible={showBackToTop}
            onPress={scrollToTop}
            isDark={isDark}
            isMobile={isMobile}
            footerBottomOffset={isMobile ? footerHeight + 18 : undefined}
            bounceStyle={bounceStyle}
          />

          <WalletConnectModal
            visible={walletModalVisible}
            onClose={() => setWalletModalVisible(false)}
            onConnect={(walletType) => {
              void handleConnect(walletType);
            }}
          />

          <WelcomeBonusModal
            visible={bonusModalVisible}
            onClose={() => setBonusModalVisible(false)}
            onClaim={() => claimRegistrationBonus()}
            onDisableShowing={() => setShowWelcomeBonusModal(false)}
            alreadyClaimed={bonusAlreadyClaimed}
          />

          {/* Floating nav — rendered last so it overlays content + dropdown isn't clipped */}
          <View
            style={styles.floatingNav}
            pointerEvents='box-none'
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              setTopNavHeight((current) => (current === nextHeight ? current : nextHeight));
            }}
          >
            <TopNav
              key={user ? 'topnav-signed-in' : 'topnav-signed-out'}
              signedIn={Boolean(user)}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              themeMode={themeMode}
              language={language}
              authMethodLabel={authMethodLabel}
              userDisplayName={profileInfo.displayName}
              userEmail={profileInfo.email}
              airsScore={airsScore}
              onSignIn={handleRequireSignIn}
              onConnectWallet={handleOpenWalletConnect}
              motionLevel={motionLevel}
              onToggleTheme={toggleThemeMode}
              onCycleLanguage={cycleLanguage}
              onCycleMotionLevel={cycleMotionLevel}
              onOpenProfile={handleOpenProfile}
              onOpenSettings={handleOpenSettings}
              onSignOut={() => {
                void handleSignOut();
              }}
              onNavigate={(key) => {
                if (key === 'dashboard') {
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                } else if (key === 'explorar') {
                  router.push('/explorar');
                } else if (key === 'portafolio') {
                  router.push('/portafolio');
                } else if (key === 'mi-perfil') {
                  router.push('/mi-perfil');
                }
              }}
              onNavigateToNotifications={() => {
                router.push('/notifications');
              }}
              notifications={notificationItems.filter((n) => !n.archived)}
              onMarkAllNotificationsRead={markAllNotificationsRead}
              onDismissNotification={dismissNotification}
            />
          </View>

          <ToastSystem toasts={toasts} onDismiss={dismissToast} />
        </View>
      </SafeAreaView>
    </ThemeProvider>
  );
}

function SectionDivider({ isDark }: { isDark: boolean }): React.JSX.Element {
  return (
    <View
      style={[
        sectionStyles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)' },
      ]}
    />
  );
}
const sectionStyles = createTypographyStyles({
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginVertical: 8,
    marginHorizontal: 16,
  },
});

const styles = createTypographyStyles({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    flexDirection: 'column',
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  scrollInner: {
    flex: 1,
  },
  authHintRow: {
    paddingHorizontal: 16,
    marginTop: -2,
    marginBottom: 4,
  },
  authHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 12,
  },
  stickyBottom: {
    marginTop: 'auto',
  },
});
