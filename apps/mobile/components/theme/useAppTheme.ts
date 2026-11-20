import { darkTheme, lightTheme, type AlternunTheme } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

/**
 * Shared UI theme for the person's theme preference. Use it in screens that build their palette
 * before rendering ScreenShell: `useTheme()` there is outside the ThemeProvider and always dark.
 */
export function useAppTheme(): AlternunTheme {
  const { themeMode } = useAppPreferences();
  return themeMode === 'dark' ? darkTheme : lightTheme;
}
