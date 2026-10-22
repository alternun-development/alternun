/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from '@jest/globals';
import { CONTENT_MAX_WIDTH, getContentGutter } from '../layout';

describe('getContentGutter', () => {
  it('returns base below the desktop breakpoint', () => {
    expect(getContentGutter(800, 16)).toBe(16);
  });
  it('centers a max-width column on wide screens', () => {
    expect(getContentGutter(1920)).toBe((1920 - CONTENT_MAX_WIDTH) / 2);
  });
  it('keeps a minimum gutter near the breakpoint', () => {
    expect(getContentGutter(1100)).toBe(32);
  });
});
