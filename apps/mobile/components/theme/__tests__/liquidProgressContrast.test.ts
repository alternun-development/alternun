/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { describe, expect, it } from '@jest/globals';
import { DARK_PALETTE, LIGHT_PALETTE, type AppPalette } from '../palette';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ['dark', DARK_PALETTE],
  ['light', LIGHT_PALETTE],
] as [string, AppPalette][])('liquid progress tokens (%s)', (_mode, p) => {
  it.each(['liquidProgressFillStart', 'liquidProgressFillEnd'] as const)(
    '%s keeps 3:1 against the track and the ticks',
    (fill) => {
      expect(contrast(p[fill], p.liquidProgressTrack)).toBeGreaterThanOrEqual(3);
      expect(contrast(p[fill], p.liquidProgressTick)).toBeGreaterThanOrEqual(3);
    }
  );

  it('keeps the ticks at 3:1 on the empty track', () => {
    expect(contrast(p.liquidProgressTick, p.liquidProgressTrack)).toBeGreaterThanOrEqual(3);
  });
});
