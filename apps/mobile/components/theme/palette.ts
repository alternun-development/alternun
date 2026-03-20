/**
 * Centralized dark/light palette tokens for the Alternun mobile app.
 *
 * Use `useAppPalette()` to get the active palette based on `themeMode`.
 * Components should reference these tokens instead of hardcoding colours.
 */

export interface AppPalette {
  // Backgrounds
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;

  // Accent (teal — same for both themes)
  accent: string;
  accentMuted: string;
  accentText: string; // text that sits ON accent bg

  // Status
  errorBg: string;
  errorBorder: string;
  errorText: string;
  errorIcon: string;
  noticeBg: string;
  noticeBorder: string;
  noticeText: string;

  // Buttons
  primaryBtnBg: string;
  primaryBtnText: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnText: string;

  // Divider / misc
  divider: string;
  overlay: string;

  // Nav / dropdown
  navBg: string;
  navBorder: string;
  dropdownBg: string;
  dropdownBorder: string;
  dropdownText: string;
  dropdownMuted: string;
  dropdownDivider: string;
  dropdownValue: string;

  // Icon colours
  iconDefault: string;
  iconMuted: string;

  // Mode identifier
  isDark: boolean;
}

export const DARK_PALETTE: AppPalette = {
  screenBg: '#050510',
  cardBg: 'rgba(13,13,31,0.96)',
  cardBorder: 'rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputBorderFocus: 'rgba(28,203,161,0.5)',

  textPrimary: '#e8e8ff',
  textSecondary: 'rgba(232,232,255,0.75)',
  textMuted: 'rgba(232,232,255,0.55)',
  textPlaceholder: 'rgba(232,232,255,0.35)',

  accent: '#1ccba1',
  accentMuted: 'rgba(28,203,161,0.16)',
  accentText: '#050510',

  errorBg: 'rgba(248,113,113,0.1)',
  errorBorder: 'rgba(248,113,113,0.35)',
  errorText: '#fca5a5',
  errorIcon: '#f87171',
  noticeBg: 'rgba(28,203,161,0.1)',
  noticeBorder: 'rgba(28,203,161,0.32)',
  noticeText: '#66e6c5',

  primaryBtnBg: '#1ccba1',
  primaryBtnText: '#050510',
  secondaryBtnBg: 'rgba(255,255,255,0.03)',
  secondaryBtnBorder: 'rgba(255,255,255,0.2)',
  secondaryBtnText: '#e8e8ff',

  divider: 'rgba(255,255,255,0.1)',
  overlay: 'rgba(5,5,16,0.82)',

  navBg: 'rgba(5,5,16,0.95)',
  navBorder: 'rgba(255,255,255,0.06)',
  dropdownBg: '#07071a',
  dropdownBorder: 'rgba(255,255,255,0.1)',
  dropdownText: '#e8e8ff',
  dropdownMuted: 'rgba(232,232,255,0.8)',
  dropdownDivider: 'rgba(255,255,255,0.07)',
  dropdownValue: '#1ccba1',

  iconDefault: 'rgba(232,232,255,0.75)',
  iconMuted: 'rgba(232,232,255,0.45)',

  isDark: true,
};

export const LIGHT_PALETTE: AppPalette = {
  screenBg: '#f1f5f9',
  cardBg: 'rgba(255,255,255,0.97)',
  cardBorder: 'rgba(15,23,42,0.1)',
  inputBg: 'rgba(15,23,42,0.04)',
  inputBorder: 'rgba(15,23,42,0.14)',
  inputBorderFocus: 'rgba(13,148,136,0.5)',

  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textPlaceholder: '#94a3b8',

  accent: '#0d9488',
  accentMuted: 'rgba(13,148,136,0.12)',
  accentText: '#ffffff',

  errorBg: 'rgba(239,68,68,0.08)',
  errorBorder: 'rgba(239,68,68,0.3)',
  errorText: '#dc2626',
  errorIcon: '#ef4444',
  noticeBg: 'rgba(13,148,136,0.08)',
  noticeBorder: 'rgba(13,148,136,0.28)',
  noticeText: '#0f766e',

  primaryBtnBg: '#0d9488',
  primaryBtnText: '#ffffff',
  secondaryBtnBg: 'rgba(15,23,42,0.03)',
  secondaryBtnBorder: 'rgba(15,23,42,0.18)',
  secondaryBtnText: '#1e293b',

  divider: 'rgba(15,23,42,0.1)',
  overlay: 'rgba(241,245,249,0.88)',

  navBg: '#ffffff',
  navBorder: 'rgba(15,23,42,0.1)',
  dropdownBg: '#ffffff',
  dropdownBorder: 'rgba(15,23,42,0.12)',
  dropdownText: '#0f172a',
  dropdownMuted: '#475569',
  dropdownDivider: 'rgba(15,23,42,0.08)',
  dropdownValue: '#0d9488',

  iconDefault: '#475569',
  iconMuted: '#94a3b8',

  isDark: false,
};
