/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from '@jest/globals';

import { calculateRbiProjection } from '../rbiProjection';

describe('calculateRbiProjection', () => {
  it.each([
    [0, 0, 0],
    [0.15, 15, 30],
    [0.5, 50, 100],
    [1, 100, 200],
  ])(
    'calculates eligible AIRS and aliquot for a %s participation factor',
    (participationFactor: number, expectedPercent: number, expectedEligibleAirs: number) => {
      expect(
        calculateRbiProjection({
          airs: 200,
          participationFactor,
          communityEligibleAirs: 200,
        })
      ).toEqual({
        participationFactorPercent: expectedPercent,
        eligibleAirs: expectedEligibleAirs,
        aliquotPercent: expectedPercent,
      });
    }
  );

  it('preserves eligible AIRS when only the community total is unavailable', () => {
    expect(
      calculateRbiProjection({
        airs: 200,
        participationFactor: 0.15,
        communityEligibleAirs: null,
      })
    ).toEqual({
      participationFactorPercent: 15,
      eligibleAirs: 30,
      aliquotPercent: null,
    });
  });

  it('returns unavailable metrics when the participation factor is null', () => {
    expect(
      calculateRbiProjection({
        airs: 200,
        participationFactor: null,
        communityEligibleAirs: 200,
      })
    ).toEqual({
      participationFactorPercent: null,
      eligibleAirs: null,
      aliquotPercent: null,
    });
  });

  it('does not invent eligible AIRS when the user balance is null', () => {
    expect(
      calculateRbiProjection({
        airs: null,
        participationFactor: 0.15,
        communityEligibleAirs: 200,
      })
    ).toEqual({
      participationFactorPercent: 15,
      eligibleAirs: null,
      aliquotPercent: null,
    });
  });

  it('does not divide by a zero community eligible AIRS total', () => {
    expect(
      calculateRbiProjection({
        airs: 200,
        participationFactor: 0.15,
        communityEligibleAirs: 0,
      })
    ).toEqual({
      participationFactorPercent: 15,
      eligibleAirs: 30,
      aliquotPercent: null,
    });
  });
});
