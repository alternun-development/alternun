/* eslint-disable @typescript-eslint/no-unsafe-call */
import { getHeroLayoutMetrics } from '../heroLayoutMetrics';

type TestFn = (name: string, fn: () => void) => void;
type ExpectFn = (actual: unknown) => {
  toBe: (expected: unknown) => void;
  toBeCloseTo: (expected: number) => void;
};

const { describe, expect, it } = globalThis as unknown as {
  describe: TestFn;
  expect: ExpectFn;
  it: TestFn;
};

describe('getHeroLayoutMetrics', () => {
  it('computes clamped metrics for a compact desktop width', () => {
    const metrics = getHeroLayoutMetrics(1024, 800, false);

    expect(metrics.heroCopyTop).toBeCloseTo(216);
    expect(metrics.heroCopyMaxWidth).toBeCloseTo(839.68);
    expect(metrics.heroHeadlineSize).toBeCloseTo(30.72);
    expect(metrics.heroHeadlineLineHeight).toBeCloseTo(33.1776);
    expect(metrics.heroKickerSize).toBe(24);
    expect(metrics.heroKickerLineHeight).toBeCloseTo(24.48);
    expect(metrics.heroButtonWidth).toBeCloseTo(245.76);
    expect(metrics.heroButtonFontSize).toBe(17);
  });

  it('clamps metrics at their ceilings for a wide desktop width', () => {
    const metrics = getHeroLayoutMetrics(1920, 1000, false);

    expect(metrics.heroCopyTop).toBe(250);
    expect(metrics.heroCopyMaxWidth).toBe(1080);
    expect(metrics.heroHeadlineSize).toBe(46);
    expect(metrics.heroHeadlineLineHeight).toBeCloseTo(49.68);
    expect(metrics.heroKickerSize).toBe(32);
    expect(metrics.heroKickerLineHeight).toBeCloseTo(32.64);
    expect(metrics.heroButtonWidth).toBe(300);
    expect(metrics.heroButtonFontSize).toBe(20);
  });

  it('uses the mobile branch, including a percentage button width, below the mobile breakpoint', () => {
    const metrics = getHeroLayoutMetrics(375, 740, true);

    expect(metrics.heroCopyTop).toBeCloseTo(162.8);
    expect(metrics.heroCopyMaxWidth).toBe(335);
    expect(metrics.heroHeadlineSize).toBe(30);
    expect(metrics.heroHeadlineLineHeight).toBeCloseTo(32.4);
    expect(metrics.heroKickerSize).toBe(20);
    expect(metrics.heroKickerLineHeight).toBeCloseTo(20.4);
    expect(metrics.heroButtonWidth).toBe('100%');
    expect(metrics.heroButtonFontSize).toBe(18);
  });
});
