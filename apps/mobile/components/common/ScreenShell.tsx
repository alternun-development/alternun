import React, { createContext, useContext, useRef, useCallback, useState, } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView, } from 'react-native';
import { SafeAreaView, } from 'react-native-safe-area-context';
import { useRouter, } from 'expo-router';
import { ThemeProvider, } from '@alternun/ui';
import TopNav from '../dashboard/TopNav';
import AppInfoFooter from './AppInfoFooter';
import { useAuth, } from '../auth/AppAuthProvider';
import type { User, } from '../auth/AppAuthProvider';
import { useAppPreferences, } from '../settings/AppPreferencesProvider';
import { useBackToTop, } from '../../hooks/useBackToTop';
import { BackToTopButton, } from './BackToTopButton';

// ── ScrollView Context for back-to-top button ──────────────────────────────────

interface ScreenShellContextType {
  setScrollRef: (ref: ScrollView | null) => void;
  onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

const ScreenShellContext = createContext<ScreenShellContextType | null>(null,);

export function useScreenShellScroll() {
  const context = useContext(ScreenShellContext,);
  if (!context) {
    throw new Error('useScreenShellScroll must be used within ScreenShell',);
  }
  return context;
}

// ── Minimal user-info helpers (mirrors Dashboard logic) ───────────────────────

function getUserDisplayName(user: User | null,): string {
  if (!user) return 'Guest';
  const m = (user.metadata ?? {}) as Record<string, unknown>;
  const firstName =
    typeof m.firstName === 'string'
      ? m.firstName
      : typeof m.first_name === 'string'
        ? m.first_name
        : '';
  const lastName =
    typeof m.lastName === 'string'
      ? m.lastName
      : typeof m.last_name === 'string'
        ? m.last_name
        : '';
  const full = `${firstName} ${lastName}`.trim();
  const candidates = [m.fullName, m.full_name, m.displayName, m.display_name, m.name, full,];
  const found = candidates.find((c,): c is string => typeof c === 'string' && c.trim().length > 0,);
  if (found) return found.trim();
  if (typeof user.email === 'string' && user.email.includes('@',)) return user.email.split('@',)[0];
  return 'Account';
}

function getUserAirsScore(user: User | null,): number | null {
  if (!user) return null;
  const m = (user.metadata ?? {}) as Record<string, unknown>;
  const stats =
    typeof m.stats === 'object' && m.stats !== null ? (m.stats as Record<string, unknown>) : {};
  const candidates = [
    stats.totalAIRS,
    stats.totalAirs,
    stats.total_airs,
    m.totalAIRS,
    m.totalAirs,
    m.total_airs,
    m.airs,
  ];
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v,)) return Math.max(0, Math.floor(v,),);
    if (typeof v === 'string' && v.trim().length > 0) {
      const n = Number(v,);
      if (Number.isFinite(n,)) return Math.max(0, Math.floor(n,),);
    }
  }
  return null;
}

function getWalletInfo(user: User | null,): { connected: boolean; address: string } {
  if (!user) return { connected: false, address: '', };
  const m = (user.metadata ?? {}) as Record<string, unknown>;
  const walletObj =
    typeof m.wallet === 'object' && m.wallet !== null
      ? (m.wallet as Record<string, unknown>)
      : undefined;
  const candidates = [
    m.walletAddress,
    m.wallet_address,
    m.address,
    walletObj?.address,
    walletObj?.walletAddress,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('0x',) && c.length >= 10)
      return { connected: true, address: c, };
  }
  if (typeof user.providerUserId === 'string' && user.providerUserId.startsWith('0x',)) {
    return { connected: true, address: user.providerUserId, };
  }
  return { connected: false, address: '', };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScreenShellProps {
  /** The nav section key that should appear active in the TopNav dropdown. */
  activeSection?: string;
  /** Optional override for the screen background (safe-area fill color). Defaults to app theme bg. */
  backgroundColor?: string;
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScreenShell({
  activeSection,
  backgroundColor,
  children,
}: ScreenShellProps,): React.JSX.Element {
  const { user, signOutUser, } = useAuth();
  const { themeMode, language, motionLevel, toggleThemeMode, cycleLanguage, cycleMotionLevel, } =
    useAppPreferences();
  const { width, } = useWindowDimensions();
  const router = useRouter();
  const isDark = themeMode === 'dark';
  const isMobile = width < 720;
  const [footerHeight, setFooterHeight,] = useState(0,);

  // Back-to-top state
  const scrollRefInternal = useRef<ScrollView>(null,);
  const { showBackToTop, handleScroll, scrollToTop, bounceStyle, } = useBackToTop({
    scrollThreshold: 200,
  },);

  const setScrollRef = useCallback((ref: ScrollView | null,) => {
    scrollRefInternal.current = ref;
  }, [],);

  const contextValue: ScreenShellContextType = {
    setScrollRef,
    onScroll: handleScroll,
  };

  const userDisplayName = getUserDisplayName(user ?? null,);
  const airsScore = getUserAirsScore(user ?? null,);
  const { connected: walletConnected, address: walletAddress, } = getWalletInfo(user ?? null,);
  const signedIn = Boolean(user,);

  const handleNavigate = (key: string,) => {
    if (key === 'dashboard') {
      router.replace('/',);
    } else if (key === 'explorar') {
      router.push('/explorar',);
    } else if (key === 'portafolio') {
      router.push('/portafolio',);
    } else if (key === 'mi-perfil') {
      router.push('/mi-perfil',);
    }
  };

  const bgColor = backgroundColor ?? (isDark ? '#050510' : '#f6f8fc');

  return (
    <ScreenShellContext.Provider value={contextValue}>
      <ThemeProvider mode={isDark ? 'dark' : 'light'}>
        <SafeAreaView
          style={[styles.root, { backgroundColor: bgColor, },]}
          edges={['top', 'left', 'right', 'bottom',]}
        >
          {/* Main content — paddingTop reserves space for the floating TopNav */}
          <View style={styles.body}>{children}</View>

          <View
            style={styles.footerStack}
            onLayout={(event,) => {
              setFooterHeight(event.nativeEvent.layout.height,);
            }}
          >
            <AppInfoFooter containerStyle={{ marginTop: 0, }} />
          </View>

          {/* Back-to-top button floats above the footer without shifting it upward. */}
          <BackToTopButton
            visible={showBackToTop}
            onPress={scrollToTop}
            isDark={isDark}
            isMobile={isMobile}
            footerBottomOffset={isMobile ? footerHeight + 18 : undefined}
            bounceStyle={bounceStyle}
          />

          {/* Floating TopNav — rendered last so it layers over content */}
          <View style={styles.floatingNav} pointerEvents='box-none'>
            <TopNav
              signedIn={signedIn}
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              themeMode={themeMode}
              language={language}
              motionLevel={motionLevel}
              userDisplayName={userDisplayName}
              userEmail={user?.email}
              airsScore={airsScore}
              activeSection={activeSection}
              onSignIn={() => router.push({ pathname: '/auth', params: { next: '/', }, },)}
              onConnectWallet={() => router.push('/mi-perfil',)}
              onToggleTheme={toggleThemeMode}
              onCycleLanguage={cycleLanguage}
              onCycleMotionLevel={cycleMotionLevel}
              onOpenProfile={() => router.push('/mi-perfil',)}
              onOpenSettings={() => router.push('/settings',)}
              onSignOut={() => {
                void signOutUser();
              }}
              onNavigate={handleNavigate}
            />
          </View>
        </SafeAreaView>
      </ThemeProvider>
    </ScreenShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingTop: 62, // space for the floating TopNav
  },
  footerStack: {
    marginTop: 'auto',
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
},);
