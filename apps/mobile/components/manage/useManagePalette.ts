import { useTheme } from '@alternun/ui';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import type { DetailPalette } from '../marketplace/types';

const DARK: DetailPalette = {
  background: '#050f0c',
  surface: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#e8fff6',
  muted: 'rgba(232, 255, 246, 0.6)',
  primary: '#1ee6b5',
  primaryDeep: '#7ff3d6',
  fill: 'rgba(30, 230, 181, 0.14)',
  mist: 'rgba(30, 230, 181, 0.13)',
};
const LIGHT: DetailPalette = {
  background: '#f0fdf9',
  surface: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(11, 90, 95, 0.12)',
  text: '#0b2d31',
  muted: 'rgba(11, 45, 49, 0.6)',
  primary: '#0d9488',
  primaryDeep: '#0b5a5f',
  fill: '#0f766e',
  mist: 'rgba(8, 127, 99, 0.11)',
};

/** Palette of the in-app manage views; cards use the shared theme surfaces like the profile. */
export function useManagePalette(): DetailPalette {
  const { themeMode } = useAppPreferences();
  const { theme } = useTheme();
  return {
    ...(themeMode === 'dark' ? DARK : LIGHT),
    surface: theme.cardBg,
    border: theme.cardBorder,
  };
}
