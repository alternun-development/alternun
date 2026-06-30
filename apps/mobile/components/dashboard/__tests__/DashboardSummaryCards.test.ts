import { describe, expect, it } from '@jest/globals';
import { getDashboardSummaryCardsLayout } from '../DashboardSummaryCards';

const describeTest = describe as unknown as (name: string, fn: () => void) => void;
const itTest = it as unknown as (name: string, fn: () => void) => void;
const expectValue = expect as unknown as (actual: unknown) => {
  toEqual(expected: unknown): void;
};

describeTest('getDashboardSummaryCardsLayout', () => {
  itTest('uses the stacked mobile layout below 720px', () => {
    expectValue(getDashboardSummaryCardsLayout(719)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: true,
    });
  });

  itTest('keeps the two-card desktop layout at 720px and above', () => {
    expectValue(getDashboardSummaryCardsLayout(720)).toEqual({
      isMobile: false,
      isCompactMobile: false,
      isDenseAtnCard: false,
    });
  });
});
