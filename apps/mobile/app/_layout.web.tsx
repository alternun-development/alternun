import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppAuthProvider } from '../components/auth/AppAuthProvider';
import AppInfoFooter from '../components/common/AppInfoFooter';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from '../components/settings/AppPreferencesProvider';
import { StyleSheet, View } from 'react-native';
import '../global.css';

export default function RootLayout(): any {
  return (
    <AppPreferencesProvider>
      <RootApp />
    </AppPreferencesProvider>
  );
}

function RootApp(): any {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;
  const segments = useSegments();
  const showLayoutFooter = segments[0] !== 'auth';

  return (
    <AppAuthProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={styles.appShell}>
          <View style={styles.stackContainer}>
            <Stack
              screenOptions={({ route }) => ({
                headerShown: !route.name.startsWith('tempobook'),
              })}
            >
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
                name='settings'
                options={{
                  title: 'Settings',
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen
                name='profile'
                options={{
                  title: 'Profile',
                  headerBackTitle: 'Back',
                }}
              />
            </Stack>
          </View>
          {showLayoutFooter ? <AppInfoFooter variant='layout' /> : null}
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
