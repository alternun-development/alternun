import React, { useCallback, useMemo, useState, } from 'react';
import type { User, } from '../auth/AppAuthProvider';
import {
  View,
  ScrollView,
  StatusBar,
  Text,
  useWindowDimensions,
  RefreshControl,
} from 'react-native';
import { useRouter, } from 'expo-router';

import AppInfoFooter from '../common/AppInfoFooter';
import { createTypographyStyles, } from '../theme/typography';
import { SafeAreaView, } from 'react-native-safe-area-context';
import { ThemeProvider, } from '@alternun/ui';

import TopNav from './TopNav';
import HeroStats from './HeroStats';
import ActivityFeed from './ActivityFeed';
import DashboardSummaryCards from './DashboardSummaryCards';
import WalletConnectModal from './WalletConnectModal';
import { useAppPreferences, } from '../settings/AppPreferencesProvider';
import { ToastSystem, type ToastItem, type ToastType, } from '@alternun/ui';
import { useBackToTop, } from '../../hooks/useBackToTop';
import { BackToTopButton, } from '../common/BackToTopButton';

let toastIdCounter = 0;

interface DashboardProps {
  user: User | null;
  /** When true the hero stats and section headers render as skeletons */
  isLoading?: boolean;
  /** Called when user taps the reload button in HeroStats */
  onReload?: () => void;
  onRequireSignIn: () => void;
  onOpenProfilePage: () => void;
  onOpenSettingsPage: () => void;
  onWalletConnect: (walletType: string) => Promise<void>;
  onSignOut: () => Promise<void>;
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

function getMetadata(user: User | null,): UserMetadata {
  if (!user?.metadata || typeof user.metadata !== 'object') {
    return {};
  }

  return user.metadata as UserMetadata;
}

function readNumber(value: unknown,): number | null {
  if (typeof value === 'number' && Number.isFinite(value,)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value,);
    if (Number.isFinite(parsed,)) {
      return parsed;
    }
  }

  return null;
}

function firstValidNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const value = readNumber(candidate,);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function clampToPositiveInteger(value: number,): number {
  if (!Number.isFinite(value,) || value < 0) {
    return 0;
  }

  return Math.floor(value,);
}

function getUserDashboardStats(user: User | null,): DashboardStats | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user,);
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
        metadata.airs,
      ) ?? 0,
    ),
    activePositions: clampToPositiveInteger(
      firstValidNumber(
        stats.activePositions,
        stats.active_positions,
        metadata.activePositions,
        metadata.active_positions,
      ) ?? 0,
    ),
    tokensHeld: clampToPositiveInteger(
      firstValidNumber(
        stats.tokensHeld,
        stats.tokens_held,
        metadata.tokensHeld,
        metadata.tokens_held,
      ) ?? 0,
    ),
    compensationsCompleted: clampToPositiveInteger(
      firstValidNumber(
        stats.compensationsCompleted,
        stats.compensations_completed,
        metadata.compensationsCompleted,
        metadata.compensations_completed,
      ) ?? 0,
    ),
  };
}

function getUserProfileInfo(user: User | null,): ProfileInfo {
  if (!user) {
    return { displayName: 'Guest', };
  }

  const metadata = getMetadata(user,);
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
    (entry,): entry is string => typeof entry === 'string' && entry.trim().length > 0,
  );

  const emailLocalPart =
    typeof user.email === 'string' && user.email.includes('@',)
      ? user.email.split('@',)[0]
      : undefined;

  return {
    displayName: nameCandidate?.trim() ?? emailLocalPart ?? 'Account',
    email: user.email,
  };
}

function getWalletAddress(user: User | null,): string {
  if (!user) {
    return '';
  }

  const metadata = getMetadata(user,);
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
    if (typeof candidate === 'string' && candidate.startsWith('0x',) && candidate.length >= 10) {
      return candidate;
    }
  }

  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x',)) {
    return user.providerUserId;
  }

  if (user.id.includes('0x',)) {
    const candidate = user.id.slice(user.id.indexOf('0x',),);
    if (candidate.length >= 10) {
      return candidate;
    }
  }

  return '';
}

function getWalletProvider(user: User | null,): string | null {
  if (!user) {
    return null;
  }

  const metadata = getMetadata(user,);
  const provider =
    typeof metadata.walletProvider === 'string'
      ? metadata.walletProvider
      : typeof metadata.wallet_provider === 'string'
        ? metadata.wallet_provider
        : null;

  if (provider && provider.trim().length > 0) {
    return provider.toLowerCase();
  }

  if (typeof user.provider === 'string' && user.provider.startsWith('wallet:',)) {
    return user.provider.replace('wallet:', '',).toLowerCase();
  }

  return null;
}

function getAuthMethodLabel(user: User | null,): string {
  if (!user) {
    return 'guest';
  }

  if (user.provider && !user.provider.startsWith('wallet:',)) {
    return `auth: ${user.provider}`;
  }

  if (user.provider && user.provider.startsWith('wallet:',)) {
    return 'auth: wallet';
  }

  if (user.email) {
    return 'auth: email';
  }

  return 'auth: session';
}

export default function Dashboard({
  user,
  isLoading = false,
  onReload,
  onRequireSignIn,
  onOpenProfilePage,
  onOpenSettingsPage,
  onWalletConnect,
  onSignOut,
}: DashboardProps,) {
  const [walletModalVisible, setWalletModalVisible,] = useState(false,);
  const [toasts, setToasts,] = useState<ToastItem[]>([],);
  const [isRefreshing, setIsRefreshing,] = useState(false,);
  const [footerHeight, setFooterHeight,] = useState(0,);
  const { width, } = useWindowDimensions();
  const isMobile = width < 720;
  const scrollTopInset = isMobile ? 82 : 62;
  const scrollBottomInset = isMobile ? 18 : 8;
  const { themeMode, language, motionLevel, toggleThemeMode, cycleLanguage, cycleMotionLevel, } =
    useAppPreferences();
  const router = useRouter();
  const isDark = themeMode === 'dark';

  const { scrollRef, showBackToTop, handleScroll, scrollToTop, bounceStyle, } = useBackToTop({
    scrollThreshold: 200,
  },);

  // Reload handler for both pull-to-refresh and button tap
  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true,);
    try {
      // Call the onReload callback from auth provider to refresh user data
      if (onReload) {
        onReload();
      }
      // Simulate a small delay to show loading state (in practice, auth refresh takes time)
      setTimeout(() => {
        setIsRefreshing(false,);
      }, 800,);
    } catch (error) {
      setIsRefreshing(false,);
    }
  }, [onReload,],);

  const addToast = useCallback((type: ToastType, title: string, message: string,) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev,) => [...prev, { id, type, title, message, },],);
    setTimeout(() => {
      setToasts((prev,) => prev.filter((t,) => t.id !== id,),);
    }, 4000,);
  }, [],);

  const dismissToast = useCallback((id: string,) => {
    setToasts((prev,) => prev.filter((t,) => t.id !== id,),);
  }, [],);

  const walletAddress = getWalletAddress(user,);
  const walletProvider = getWalletProvider(user,);
  const walletConnected = Boolean(walletAddress || walletProvider,);
  const authMethodLabel = getAuthMethodLabel(user,);
  const userStats = useMemo(() => getUserDashboardStats(user,), [user,],);
  const profileInfo = useMemo(() => getUserProfileInfo(user,), [user,],);

  const handleRequireSignIn = useCallback(() => {
    onRequireSignIn();
  }, [onRequireSignIn,],);

  const handleOpenWalletConnect = useCallback(() => {
    if (!user) {
      addToast('info', 'Sign In Required', 'Sign in first to connect a wallet.',);
      onRequireSignIn();
      return;
    }

    setWalletModalVisible(true,);
  }, [addToast, onRequireSignIn, user,],);

  const handleConnect = useCallback(
    async (walletType: string,) => {
      setWalletModalVisible(false,);
      try {
        await onWalletConnect(walletType,);
        addToast('success', 'Wallet Connected', 'Wallet authentication completed.',);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to connect wallet at this time.';
        addToast('error', 'Wallet Connection Failed', message,);
      }
    },
    [addToast, onWalletConnect,],
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
      addToast('error', 'Sign Out Failed', message,);
    }
  }, [addToast, onRequireSignIn, onSignOut, user,],);

  const handleOpenProfile = useCallback(() => {
    onOpenProfilePage();
  }, [onOpenProfilePage,],);

  const handleOpenSettings = useCallback(() => {
    onOpenSettingsPage();
  }, [onOpenSettingsPage,],);

  return (
    <ThemeProvider mode={isDark ? 'dark' : 'light'}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#050510' : '#f6f8fc'}
        />
        <View style={[styles.container, { backgroundColor: isDark ? '#050510' : '#f6f8fc', },]}>
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
                totalAIRS={userStats ? userStats.totalAIRS : null}
                activePositions={userStats ? userStats.activePositions : null}
                tokensHeld={userStats ? userStats.tokensHeld : null}
                compensationsCompleted={userStats ? userStats.compensationsCompleted : null}
                isLoading={isLoading || isRefreshing}
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
                      { color: isDark ? 'rgba(232,232,255,0.72)' : '#475569', },
                    ]}
                  >
                    Sign in from the top-right profile menu to activate actions.
                  </Text>
                </View>
              ) : null}

              {/* ── Recent Activity + Summary Cards ─────────────────────── */}
              <SectionDivider isDark={isDark} />
              <ActivityFeed isDark={isDark} />
              <DashboardSummaryCards isDark={isDark} />
            </View>
          </ScrollView>

          <View
            style={styles.stickyBottom}
            onLayout={(event,) => {
              setFooterHeight(event.nativeEvent.layout.height,);
            }}
          >
            <AppInfoFooter containerStyle={{ marginTop: 0, }} />
          </View>

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
            onClose={() => setWalletModalVisible(false,)}
            onConnect={(walletType,) => {
              void handleConnect(walletType,);
            }}
          />

          {/* Floating nav — rendered last so it overlays content + dropdown isn't clipped */}
          <View style={styles.floatingNav} pointerEvents='box-none'>
            <TopNav
              key={user ? 'topnav-signed-in' : 'topnav-signed-out'}
              signedIn={Boolean(user,)}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              themeMode={themeMode}
              language={language}
              authMethodLabel={authMethodLabel}
              userDisplayName={profileInfo.displayName}
              userEmail={profileInfo.email}
              airsScore={userStats?.totalAIRS ?? null}
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
              onNavigate={(key,) => {
                if (key === 'dashboard') {
                  scrollRef.current?.scrollTo({ y: 0, animated: true, },);
                } else if (key === 'explorar') {
                  router.push('/explorar',);
                } else if (key === 'portafolio') {
                  router.push('/portafolio',);
                } else if (key === 'mi-perfil') {
                  router.push('/mi-perfil',);
                }
              }}
            />
          </View>

          <ToastSystem toasts={toasts} onDismiss={dismissToast} />
        </View>
      </SafeAreaView>
    </ThemeProvider>
  );
}

function SectionDivider({ isDark, }: { isDark: boolean },) {
  return (
    <View
      style={[
        sectionStyles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)', },
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
},);

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
},);
