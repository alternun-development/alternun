/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { describe, expect, it } from '@jest/globals';

import { getDashboardSummaryCardsLayout } from '../dashboardSummaryCardsLayout';

describe('getDashboardSummaryCardsLayout', () => {
  it('uses the stacked mobile layout below 720px', () => {
    expect(getDashboardSummaryCardsLayout(719)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: false,
    });
  });

  it('keeps the two-card desktop layout at 720px and above', () => {
    expect(getDashboardSummaryCardsLayout(720)).toEqual({
      isMobile: false,
      isCompactMobile: false,
      isDenseAtnCard: false,
    });
  });

  it('switches the ATN card to dense mode on narrow or high-scale mobile screens', () => {
    expect(getDashboardSummaryCardsLayout(412)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: true,
    });

    expect(getDashboardSummaryCardsLayout(540, 1.25)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: true,
    });
  });
});
