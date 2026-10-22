/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from '@jest/globals';

import { calculateTierProgress } from '../../../../../packages/ui/src/components/heroPanelProgress';

describe('calculateTierProgress', () => {
  it('never returns a negative progress for a negative balance', () => {
    expect(calculateTierProgress(-250, 0, 1_000)).toBe(0);
  });

  it('never returns a negative progress below the tier minimum', () => {
    expect(calculateTierProgress(900, 1_000, 5_000)).toBe(0);
  });

  it('returns the fraction inside the tier and caps at 100 %', () => {
    expect(calculateTierProgress(0, 0, 1_000)).toBe(0);
    expect(calculateTierProgress(500, 0, 1_000)).toBe(0.5);
    expect(calculateTierProgress(3_000, 1_000, 5_000)).toBe(0.5);
    expect(calculateTierProgress(9_999, 1_000, 5_000)).toBe(1);
  });
});
