/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
// The hooks only read the (mocked) preference, so they can be called directly.
import { describe, expect, it, jest } from '@jest/globals';
import { darkTheme, lightTheme } from '@alternun/ui';
import { useAppTheme } from '../useAppTheme';
import { useManagePalette } from '../../manage/useManagePalette';

jest.mock('@alternun/ui', () => ({
  darkTheme: { cardBg: 'dark-card', cardBorder: 'dark-border' },
  lightTheme: { cardBg: 'light-card', cardBorder: 'light-border' },
}));

let mockThemeMode: 'dark' | 'light' = 'light';
jest.mock('../../settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ themeMode: mockThemeMode }),
}));

describe('useAppTheme', () => {
  it('follows the light preference even without a ThemeProvider above it', () => {
    mockThemeMode = 'light';
    expect(useAppTheme()).toBe(lightTheme);
  });

  it('follows the dark preference', () => {
    mockThemeMode = 'dark';
    expect(useAppTheme()).toBe(darkTheme);
  });
});

describe('useManagePalette', () => {
  it('uses light card surfaces in light mode (regression: cards were dark)', () => {
    mockThemeMode = 'light';
    const palette = useManagePalette();
    expect(palette.surface).toBe(lightTheme.cardBg);
    expect(palette.border).toBe(lightTheme.cardBorder);
    expect(palette.background).toBe('#f0fdf9');
  });

  it('uses dark card surfaces in dark mode', () => {
    mockThemeMode = 'dark';
    expect(useManagePalette().surface).toBe(darkTheme.cardBg);
  });
});
