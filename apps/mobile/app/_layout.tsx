import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { AppAuthProvider } from '../components/auth/AppAuthProvider';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from '../components/settings/AppPreferencesProvider';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): React.JSX.Element {
  const [loaded] = useFonts({
    // Expo expects a bundled asset module reference here.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  return (
    <AppPreferencesProvider>
      <RootApp fontsLoaded={loaded} />
    </AppPreferencesProvider>
  );
}

function RootApp({ fontsLoaded }: { fontsLoaded: boolean }): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const handleLayout = useCallback(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);
  return (
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
});
