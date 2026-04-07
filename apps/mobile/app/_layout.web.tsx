import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppAuthProvider } from '../components/auth/AppAuthProvider';
import AppInfoFooter from '../components/common/AppInfoFooter';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from '../components/settings/AppPreferencesProvider';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import ReleaseUpdateBanner from '../components/release/ReleaseUpdateBanner.web';
import '../global.css';

export default function RootLayout(): React.JSX.Element {
  return (
    <AppPreferencesProvider>
      <RootApp />
    </AppPreferencesProvider>
  );
}

function RootApp(): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const colorScheme = useColorScheme();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    colorScheme.setColorScheme(themeMode);
  }, [colorScheme, themeMode]);
  const pathname = usePathname();
  const showLayoutFooter =
    pathname !== '/auth' &&
    pathname !== '/auth-relay' &&
    pathname !== '/auth/callback' &&
    pathname !== '/' &&
    pathname !== '/privacy' &&
    pathname !== '/terms';

  return (
    <AppAuthProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={styles.appShell}>
          <View style={styles.stackContainer}>
            <Stack screenOptions={{ headerShown: false }}>
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
                  title: 'Settings',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen
                name='profile'
                options={{
                  headerShown: true,
                  title: 'Profile',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen
                name='compensaciones'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='mis-atn'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='proyectos'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='beneficios'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='ranking'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='wallet'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='privacy'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name='terms'
                options={{ headerShown: false, animation: 'slide_from_right' }}
              />
            </Stack>
          </View>
          {showLayoutFooter ? (
            <View pointerEvents='box-none' style={styles.footerOverlay}>
              <AppInfoFooter />
            </View>
          ) : null}
          <ReleaseUpdateBanner />
        </View>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </AppAuthProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  stackContainer: {
    flex: 1,
  },
  footerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
});
