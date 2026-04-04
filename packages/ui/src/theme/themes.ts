import { palette } from '../tokens/colors';

export interface AlternunTheme {
  // Surfaces
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

  // Accent
  accent: string;
  accentMuted: string;
  accentText: string;

  // Semantic
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

  // Misc
  divider: string;
  overlay: string;

  // Nav / Dropdown
  navBg: string;
  navBorder: string;
  dropdownBg: string;
  dropdownBorder: string;
  dropdownText: string;
  dropdownMuted: string;
  dropdownDivider: string;
  dropdownValue: string;

  // Icons
  iconDefault: string;
  iconMuted: string;

  // Skeleton shimmer colors
  skeletonBase: string;
  skeletonHighlight: string;

  isDark: boolean;
}

export const darkTheme: AlternunTheme = {
  screenBg: palette.surface950,
  cardBg: 'rgba(13,13,31,0.96)',
  cardBorder: 'rgba(255,255,255,0.08)',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.12)',
  inputBorderFocus: 'rgba(28,203,161,0.5)',

  textPrimary: palette.textDark,
  textSecondary: palette.textDarkMuted75,
  textMuted: palette.textDarkMuted55,
  textPlaceholder: palette.textDarkMuted35,

  accent: palette.teal,
  accentMuted: 'rgba(28,203,161,0.16)',
  accentText: palette.surface950,

  errorBg: palette.errorDim,
  errorBorder: palette.errorBorder,
  errorText: '#fca5a5',
  errorIcon: palette.error,

  noticeBg: 'rgba(28,203,161,0.10)',
  noticeBorder: 'rgba(28,203,161,0.32)',
  noticeText: '#66e6c5',

  primaryBtnBg: palette.teal,
  primaryBtnText: palette.surface950,
  secondaryBtnBg: 'rgba(255,255,255,0.03)',
  secondaryBtnBorder: 'rgba(255,255,255,0.20)',
  secondaryBtnText: palette.textDark,

  divider: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(5,5,16,0.82)',

  navBg: 'rgba(5,5,16,0.95)',
  navBorder: 'rgba(255,255,255,0.06)',
  dropdownBg: palette.surface800,
  dropdownBorder: 'rgba(255,255,255,0.10)',
  dropdownText: palette.textDark,
  dropdownMuted: 'rgba(232,232,255,0.80)',
  dropdownDivider: 'rgba(255,255,255,0.07)',
  dropdownValue: palette.teal,

  iconDefault: palette.textDarkMuted75,
  iconMuted: 'rgba(232,232,255,0.45)',

  skeletonBase: 'rgba(255,255,255,0.06)',
  skeletonHighlight: 'rgba(255,255,255,0.13)',

  isDark: true,
};

export const lightTheme: AlternunTheme = {
  screenBg: palette.slate100,
  cardBg: 'rgba(255,255,255,0.97)',
  cardBorder: 'rgba(15,23,42,0.10)',
  inputBg: 'rgba(15,23,42,0.03)',
  inputBorder: 'rgba(15,23,42,0.18)',
  inputBorderFocus: 'rgba(13,148,136,0.50)',

  textPrimary: palette.slate900,
  textSecondary: palette.slate700,
  textMuted: palette.slate600,
  textPlaceholder: '#94a3b8',

  accent: palette.tealDark,
  accentMuted: 'rgba(13,148,136,0.12)',
  accentText: palette.white,

  errorBg: 'rgba(239,68,68,0.08)',
  errorBorder: 'rgba(239,68,68,0.30)',
  errorText: '#dc2626',
  errorIcon: '#ef4444',

  noticeBg: 'rgba(13,148,136,0.08)',
  noticeBorder: 'rgba(13,148,136,0.28)',
  noticeText: '#0f766e',

  primaryBtnBg: palette.tealDark,
  primaryBtnText: palette.white,
  secondaryBtnBg: 'rgba(15,23,42,0.03)',
  secondaryBtnBorder: 'rgba(15,23,42,0.18)',
  secondaryBtnText: palette.slate800,

  divider: 'rgba(15,23,42,0.10)',
  overlay: 'rgba(241,245,249,0.88)',

  navBg: palette.white,
  navBorder: 'rgba(15,23,42,0.10)',
  dropdownBg: palette.white,
  dropdownBorder: 'rgba(15,23,42,0.12)',
  dropdownText: palette.slate900,
  dropdownMuted: palette.slate600,
  dropdownDivider: 'rgba(15,23,42,0.08)',
  dropdownValue: palette.tealDark,

  iconDefault: palette.slate600,
  iconMuted: '#94a3b8',

  skeletonBase: 'rgba(15,23,42,0.08)',
  skeletonHighlight: 'rgba(15,23,42,0.15)',

  isDark: false,
};
