/**
 * Alternun Design System — Color Tokens
 * Single source of truth for all color values across web and mobile.
 */

export const palette = {
  // Brand
  teal: '#1ccba1',
  tealDark: '#0d9488',
  tealLight: '#5bf6d0',

  // Gold tier
  gold: '#d4b96a',
  goldLight: '#f0d896',

  // Base backgrounds
  navy900: '#040f1e',
  navy800: '#081627',
  navy700: '#0d1a2f',
  navy600: '#0f172a',

  // Dark surface
  surface950: '#050510',
  surface900: '#0d0d1f',
  surface800: '#07071a',

  // Slate (light mode)
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  // Text (dark)
  textDark: '#e8e8ff',
  textDarkMuted75: 'rgba(232,232,255,0.75)',
  textDarkMuted55: 'rgba(232,232,255,0.55)',
  textDarkMuted35: 'rgba(232,232,255,0.35)',

  // Semantic
  error: '#f87171',
  errorDim: 'rgba(248,113,113,0.1)',
  errorBorder: 'rgba(248,113,113,0.35)',

  success: '#34d399',
  successDim: 'rgba(52,211,153,0.12)',

  warning: '#f59e0b',
  warningDim: 'rgba(245,158,11,0.12)',

  info: '#818cf8',
  infoDim: 'rgba(129,140,248,0.12)',

  // Status tiers
  statusBronze: '#cd7f32',
  statusSilver: '#a8b8cc',
  statusGold: '#d4b96a',
  statusPlatinum: '#9ba9c4',

  // Hero / forest backgrounds
  heroForestDark: '#050f0c',
  heroForestLight: '#eaf8f3',

  // Pure
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type PaletteKey = keyof typeof palette;
