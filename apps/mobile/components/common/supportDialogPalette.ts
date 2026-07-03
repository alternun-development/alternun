export interface SupportDialogPalette {
  title: string;
  muted: string;
  accent: string;
  text: string;
  shellBg: string;
  overlayBg: string;
  borderColor: string;
}

const DARK_SUPPORT_DIALOG_PALETTE: SupportDialogPalette = {
  title: '#effff9',
  muted: 'rgba(220,255,246,0.62)',
  accent: '#1ee6b5',
  text: '#effff9',
  shellBg: '#0d0d1f',
  overlayBg: 'rgba(0,0,0,0.72)',
  borderColor: 'rgba(255,255,255,0.09)',
};

const LIGHT_SUPPORT_DIALOG_PALETTE: SupportDialogPalette = {
  title: '#0f172a',
  muted: '#475569',
  accent: '#0d9488',
  text: '#0f172a',
  shellBg: '#f8fafb',
  overlayBg: 'rgba(0,0,0,0.38)',
  borderColor: 'rgba(15,23,42,0.1)',
};

export function createSupportDialogPalette(isDark: boolean): SupportDialogPalette {
  return isDark ? DARK_SUPPORT_DIALOG_PALETTE : LIGHT_SUPPORT_DIALOG_PALETTE;
}
