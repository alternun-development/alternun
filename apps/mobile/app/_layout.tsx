import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AppAuthProvider } from '../components/auth/AppAuthProvider';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from '../components/settings/AppPreferencesProvider';
import { NotificationsProvider } from '../components/notifications/NotificationsContext';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner.native';
import { appFonts, installAppFontDefaults } from '../components/theme/fonts';
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

function RootApp({ fontsLoaded }: { fontsLoaded: boolean }): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const pathname = usePathname();
  const releaseBannerBottomOffset = pathname === '/' ? 156 : 24;
  const handleLayout = useCallback(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);
  return (
    <NotificationsProvider>
      <AppAuthProvider>
        <ThemeProvider value={navigationTheme}>
          <View style={styles.appShell} onLayout={handleLayout}>
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
  },
  stackContainer: {
    flex: 1,
  },
});
