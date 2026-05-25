import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AppAuthProvider } from '../components/auth/AppAuthProvider';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from '../components/settings/AppPreferencesProvider';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import 'react-native-reanimated';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner.native';
import { appFonts, installAppFontDefaults } from '../components/theme/fonts';
import { BottomDock, DOCK_HEIGHT, type DockTab } from '../components/navigation/BottomDock';
import { USE_V2_NAV } from '../components/navigation/featureFlags';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();
installAppFontDefaults();

export default function RootLayout(): React.JSX.Element {
  const [loaded] = useFonts(appFonts);

  return (
    <AppPreferencesProvider>
      <RootApp fontsLoaded={loaded} />
    </AppPreferencesProvider>
  );
}

// Routes where the dock should be visually hidden (utility/modal screens)
const DOCK_HIDDEN_ROUTES = new Set([
  '/auth',
  '/auth-relay',
  '/auth/callback',
  '/auth/reset-password',
]);

function RootApp({ fontsLoaded }: { fontsLoaded: boolean }): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 720;
  const isDark = themeMode === 'dark';

  // Always mount the dock on mobile v2 to avoid stacking context issues from remounting
  const mountDock = USE_V2_NAV && isMobile;
  const dockVisible = mountDock && !DOCK_HIDDEN_ROUTES.has(pathname);

  // Release banner sits above the dock on the home screen
  const releaseBannerBottomOffset = pathname === '/' ? 156 + DOCK_HEIGHT : 24;

  const handleLayout = useCallback(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Map pathname to active dock tab
  const activeTab: DockTab =
    pathname === '/portafolio'
      ? 'portafolio'
      : pathname === '/explorar'
      ? 'explorar'
      : pathname === '/mi-perfil'
      ? 'mi-perfil'
      : 'dashboard';

  return (
    <NotificationsProvider>
      <AppAuthProvider>
        <ThemeProvider value={navigationTheme}>
          <View style={styles.appShell} onLayout={handleLayout}>
            {/* stackContainer flexes to fill remaining space above the dock */}
            <View style={styles.stackContainer}>
              <Stack screenOptions={{ headerShown: false, header: () => null }}>
                <Stack.Screen name='index' options={{ headerShown: false }} />
                <Stack.Screen
                  name='auth'
                  options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name='auth/reset-password'
                  options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name='auth-relay'
                  options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name='auth/callback'
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name='settings'
                  options={{
                    headerShown: false,
                    animationEnabled: false,
                  }}
                />
                <Stack.Screen
                  name='explorar'
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name='portafolio'
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name='mi-perfil'
                  options={{
                    headerShown: false,
                    animationEnabled: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name='privacy'
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name='terms'
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name='notifications'
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
              </Stack>
            </View>
            <ReleaseUpdateBanner bottomOffset={releaseBannerBottomOffset} />

            {/*
              Dock is a natural flex child BELOW stackContainer.
              Stack screens animate within stackContainer's bounds and cannot paint
              over siblings that live outside it — no z-index needed.
            */}
            {mountDock && (
              <View
                style={!dockVisible ? styles.dockHidden : undefined}
                pointerEvents={dockVisible ? 'box-none' : 'none'}
              >
                <BottomDock
                  activeTab={activeTab}
                  isDark={isDark}
                  onChangeTab={(tab: DockTab) => {
                    if (tab === 'dashboard') {
                      router.replace('/');
                    } else if (tab === 'portafolio' || tab === 'explorar' || tab === 'mi-perfil') {
                      router.push(`/${tab}`);
                    }
                  }}
                />
              </View>
            )}
          </View>
          <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </AppAuthProvider>
    </NotificationsProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    flexDirection: 'column',
  },
  stackContainer: {
    flex: 1,
  },
  dockHidden: {
    opacity: 0,
  },
});
