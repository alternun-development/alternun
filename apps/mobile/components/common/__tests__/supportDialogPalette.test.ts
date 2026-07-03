/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { describe, expect, it } from '@jest/globals';

import { createSupportDialogPalette } from '../supportDialogPalette';

describe('createSupportDialogPalette', () => {
  it('returns a dark modal palette when the app theme is dark', () => {
    expect(createSupportDialogPalette(true)).toEqual({
      title: '#effff9',
      muted: 'rgba(220,255,246,0.62)',
      accent: '#1ee6b5',
      text: '#effff9',
      shellBg: '#0d0d1f',
      overlayBg: 'rgba(0,0,0,0.72)',
      borderColor: 'rgba(255,255,255,0.09)',
    });
  });

  it('returns a light modal palette when the app theme is light', () => {
    expect(createSupportDialogPalette(false)).toEqual({
      title: '#0f172a',
      muted: '#475569',
      accent: '#0d9488',
      text: '#0f172a',
      shellBg: '#f8fafb',
      overlayBg: 'rgba(0,0,0,0.38)',
      borderColor: 'rgba(15,23,42,0.1)',
    });
  });
});
