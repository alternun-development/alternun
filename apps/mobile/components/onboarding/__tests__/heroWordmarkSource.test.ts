/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  HERO_WORDMARK_DARK_SOURCE,
  HERO_WORDMARK_LIGHT_SOURCE,
  resolveHeroWordmarkSource,
} from '../heroWordmarkSource';

type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('resolveHeroWordmarkSource', () => {
  it('keeps the top hero wordmark on the light asset in dark mode', () => {
    expect(resolveHeroWordmarkSource(true, true)).toBe(HERO_WORDMARK_LIGHT_SOURCE);
  });

  it('uses the dark asset after the hero scrolls away in dark mode', () => {
    expect(resolveHeroWordmarkSource(true, false)).toBe(HERO_WORDMARK_DARK_SOURCE);
  });

  it('uses the light asset in light mode', () => {
    expect(resolveHeroWordmarkSource(false, false)).toBe(HERO_WORDMARK_LIGHT_SOURCE);
  });
});
