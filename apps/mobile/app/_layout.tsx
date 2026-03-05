import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { AppAuthProvider } from "../components/auth/AppAuthProvider";
import AppInfoFooter from "../components/common/AppInfoFooter";
import { AppPreferencesProvider, useAppPreferences } from "../components/settings/AppPreferencesProvider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppPreferencesProvider>
      <RootApp />
    </AppPreferencesProvider>
  );
}

function RootApp() {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <AppAuthProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={styles.appShell}>
          <View style={styles.stackContainer}>
            <Stack
              screenOptions={({ route }) => ({
                headerShown: !route.name.startsWith("tempobook"),
              })}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen
                name="auth"
                options={{
                  headerShown: false,
                  presentation: "transparentModal",
                  animation: "fade",
                  contentStyle: { backgroundColor: "transparent" },
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  title: "Settings",
                  headerBackTitle: "Back",
                }}
              />
              <Stack.Screen
                name="profile"
                options={{
                  title: "Profile",
                  headerBackTitle: "Back",
                }}
              />
            </Stack>
          </View>
          <AppInfoFooter variant="layout" />
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
