/**
 * Theme tokens for tooltip system — maps Alternun design system to tooltip colors.
 */

export interface TooltipTheme {
  bgColor: string;
  textColor: string;
  borderColor: string;
  shadowColor: string;
  accentColor: string;
}

export const tooltipThemes = {
  dark: {
    bgColor: '#050f0c',
    textColor: '#effff9',
    borderColor: 'rgba(30,230,181,0.24)',
    shadowColor: 'rgba(0,0,0,0.4)',
    accentColor: '#1ee6b5',
  } as TooltipTheme,
  light: {
    bgColor: '#ffffff',
    textColor: '#0b2d31',
    borderColor: 'rgba(11,90,95,0.14)',
    shadowColor: 'rgba(0,0,0,0.1)',
    accentColor: '#0b5a5f',
  } as TooltipTheme,
};

export function getTooltipTheme(isDark: boolean): TooltipTheme {
  return isDark ? tooltipThemes.dark : tooltipThemes.light;
}
