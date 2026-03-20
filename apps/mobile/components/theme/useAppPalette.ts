import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { DARK_PALETTE, LIGHT_PALETTE, type AppPalette } from './palette';

export function useAppPalette(): AppPalette {
  const { themeMode } = useAppPreferences();
  return themeMode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
