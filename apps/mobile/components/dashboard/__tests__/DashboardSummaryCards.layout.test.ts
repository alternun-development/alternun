/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { describe, expect, it } from '@jest/globals';

import { getDashboardSummaryCardsLayout } from '../DashboardSummaryCards';

describe('getDashboardSummaryCardsLayout', () => {
  it('only enables the dense ATN layout on narrow mobile screens', () => {
    expect(getDashboardSummaryCardsLayout(375)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: true,
    });

    expect(getDashboardSummaryCardsLayout(500)).toEqual({
      isMobile: true,
      isCompactMobile: true,
      isDenseAtnCard: false,
    });
  });
});
