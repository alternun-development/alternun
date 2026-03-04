import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppAuthProvider } from "../components/auth/AppAuthProvider";
import {
  AppPreferencesProvider,
  useAppPreferences,
} from "../components/settings/AppPreferencesProvider";
import "../global.css";

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <RootApp />
    </AppPreferencesProvider>
  );
}

function RootApp() {
  const { themeMode } = useAppPreferences();
  const navigationTheme = themeMode === "dark" ? DarkTheme : DefaultTheme;

  return (
    <AppAuthProvider>
      <ThemeProvider value={navigationTheme}>
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
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </AppAuthProvider>
  );
}
